const env = require("../../config/env");
const logger = require("../../utils/logger");
const ASSISTANT_PROMPT = require("./assistantPrompt");
const {
  FALLBACK_TOPICS,
  generateFallbackResponse,
} = require("./learningAssistant.fallback");
const LearningAssistantConversation = require("./learningAssistant.model");
const {
  buildTopicGuardInstructions,
  detectLearningTopic,
  filterHistoryForTopic,
  isContextRequired,
  validateTopicAnswer,
} = require("./topicGuard");

const TEMPORARILY_UNAVAILABLE =
  "Learning Assistant is temporarily unavailable. Please try again later.";
const MAX_HISTORY_MESSAGES = 40;
const MAX_CONTEXT_MESSAGES = 10;
const MAX_OUTPUT_TOKENS = 2200;
const EDUCATIONAL_TEMPERATURE = 0.25;

const vagueQuestions = new Set([
  "help",
  "help me",
  "i need help",
  "i have a doubt",
  "explain",
  "explain this",
  "teach me",
  "what is this",
]);

const isVagueQuestion = (message) => {
  const normalized = message.toLowerCase().replace(/[?.!]+$/g, "").trim();
  if (detectLearningTopic(normalized)) {
    return false;
  }
  return vagueQuestions.has(normalized) || normalized.split(/\s+/).length < 2;
};

const clarificationFor = (message) => {
  const topic = message.trim();
  if (topic.split(/\s+/).length === 1 && !vagueQuestions.has(topic.toLowerCase())) {
    return `What would you like to understand about ${topic}?`;
  }
  return "Which topic or problem would you like help with?";
};

const toPublicMessage = (message) => ({
  id: String(message._id),
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
});

const getHistory = async (userId) => {
  const conversation = await LearningAssistantConversation.findOne({ user: userId }).lean();
  return (conversation?.messages || []).map(toPublicMessage);
};

const clearHistory = async (userId) => {
  await LearningAssistantConversation.deleteOne({ user: userId });
};

const recordExchange = async (userId, userContent, assistantContent) => {
  const createdAt = new Date();
  const conversation = await LearningAssistantConversation.findOneAndUpdate(
    { user: userId },
    {
      $push: {
        messages: {
          $each: [
            { role: "user", content: userContent, createdAt },
            { role: "assistant", content: assistantContent, createdAt },
          ],
          $slice: -MAX_HISTORY_MESSAGES,
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const messages = conversation.messages || [];
  return messages.slice(-2).map(toPublicMessage);
};

const extractResponseText = (payload) => {
  if (typeof payload?.output_text === "string") {
    return payload.output_text.trim();
  }

  for (const outputItem of payload?.output || []) {
    for (const contentItem of outputItem?.content || []) {
      if (contentItem?.type === "output_text" && typeof contentItem.text === "string") {
        return contentItem.text.trim();
      }
    }
  }

  return "";
};

class AiProviderError extends Error {
  constructor(reason, message, details = {}) {
    super(message);
    this.name = "AiProviderError";
    this.reason = reason;
    this.status = details.status;
    this.code = details.code;
    this.provider = details.provider;
    this.model = details.model;
    this.retryable = Boolean(details.retryable);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const configuredProvider = () => {
  const provider = ["openai", "gemini"].includes(env.aiProvider)
    ? env.aiProvider
    : "openai";

  if (provider === "gemini") {
    return {
      provider,
      apiKey: env.geminiApiKey,
      model: env.geminiModel,
    };
  }

  return {
    provider: "openai",
    apiKey: env.openAiApiKey,
    model: env.openAiModel,
  };
};

const safeProviderError = (error) => ({
  reason: error.reason || "unknown",
  status: error.status,
  code: error.code,
  provider: error.provider,
  model: error.model,
  retryable: Boolean(error.retryable),
});

const previewText = (value, maxLength = 280) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const learningAssistantTrace = (message, metadata = {}) => {
  logger.info(message, {
    module: "learningAssistant",
    ...metadata,
  });
};

const parseProviderErrorPayload = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
};

const classifyOpenAiHttpError = ({ response, payload, providerConfig }) => {
  const providerError = payload?.error || {};
  const code = providerError.code || providerError.type;
  const message = providerError.message || `AI provider returned status ${response.status}.`;

  if (response.status === 401 || response.status === 403) {
    return new AiProviderError("invalid_key", message, {
      status: response.status,
      code,
      provider: providerConfig.provider,
      model: providerConfig.model,
    });
  }

  if (response.status === 404) {
    return new AiProviderError("missing_model", message, {
      status: response.status,
      code,
      provider: providerConfig.provider,
      model: providerConfig.model,
    });
  }

  if (response.status === 429 && code === "insufficient_quota") {
    return new AiProviderError("quota_exceeded", message, {
      status: response.status,
      code,
      provider: providerConfig.provider,
      model: providerConfig.model,
    });
  }

  if (response.status === 429) {
    return new AiProviderError("rate_limited", message, {
      status: response.status,
      code,
      provider: providerConfig.provider,
      model: providerConfig.model,
      retryable: true,
    });
  }

  return new AiProviderError(response.status >= 500 ? "provider_server_error" : "provider_request_error", message, {
    status: response.status,
    code,
    provider: providerConfig.provider,
    model: providerConfig.model,
    retryable: response.status >= 500,
  });
};

const toOpenAiInput = (contextMessages, message) => [
  ...contextMessages.map(({ role, content }) => ({
    role,
    content,
  })),
  { role: "user", content: message },
];

const toGeminiContents = (contextMessages, message) => [
  ...contextMessages.map(({ role, content }) => ({
    role: role === "assistant" ? "model" : "user",
    parts: [{ text: content }],
  })),
  { role: "user", parts: [{ text: message }] },
];

const buildInstructions = ({ user, topic, contextRequired }) => {
  const studentContext = [
    user?.course ? `Course: ${user.course}` : null,
    user?.year ? `Year: ${user.year}` : null,
    user?.preferences?.preferredSubjects?.length
      ? `Current interests: ${user.preferences.preferredSubjects.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  return `${ASSISTANT_PROMPT}\n\n${buildTopicGuardInstructions({
    topic,
    contextRequired,
  })}\n\nStudent context: ${
    studentContext || "No additional profile context available."
  }`;
};

const fetchJsonWithTimeout = async ({ url, options, providerConfig }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.learningAssistantTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await parseProviderErrorPayload(response);
      throw classifyOpenAiHttpError({ response, payload, providerConfig });
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AiProviderError("timeout", "AI provider request timed out.", {
        provider: providerConfig.provider,
        model: providerConfig.model,
        retryable: true,
      });
    }

    if (error instanceof AiProviderError) {
      throw error;
    }

    throw new AiProviderError("network_error", "AI provider network request failed.", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const requestOpenAiResponse = async ({ contextMessages, message, user, providerConfig, topic, contextRequired }) => {
  const instructions = buildInstructions({ user, topic, contextRequired });
  const input = toOpenAiInput(contextMessages, message);

  learningAssistantTrace("Learning Assistant OpenAI request prepared", {
    provider: providerConfig.provider,
    model: providerConfig.model,
    detectedTopic: topic?.id || null,
    contextMessages: contextMessages.length,
    retrievalUsed: false,
    retrievedDocuments: 0,
    similarityScore: null,
    promptPreview: previewText(`${instructions}\n${message}`),
  });

  const payload = await fetchJsonWithTimeout({
    url: "https://api.openai.com/v1/responses",
    providerConfig,
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: providerConfig.model,
        instructions,
        input,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        temperature: EDUCATIONAL_TEMPERATURE,
      }),
    },
  });

  if (payload?.error) {
    throw new AiProviderError("provider_response_error", payload.error.message || "AI provider returned an error.", {
      code: payload.error.code,
      provider: providerConfig.provider,
      model: providerConfig.model,
      retryable: payload.error.code === "rate_limit_exceeded",
    });
  }

  const text = extractResponseText(payload);
  if (!text) {
    throw new AiProviderError("empty_response", "AI provider returned an empty response.", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      retryable: true,
    });
  }

  learningAssistantTrace("Learning Assistant OpenAI response received", {
    provider: providerConfig.provider,
    model: providerConfig.model,
    detectedTopic: topic?.id || null,
    responsePreview: previewText(text),
  });

  return text;
};

const requestGeminiResponse = async ({ contextMessages, message, user, providerConfig, topic, contextRequired }) => {
  const instructions = buildInstructions({ user, topic, contextRequired });

  learningAssistantTrace("Learning Assistant Gemini request prepared", {
    provider: providerConfig.provider,
    model: providerConfig.model,
    detectedTopic: topic?.id || null,
    contextMessages: contextMessages.length,
    retrievalUsed: false,
    retrievedDocuments: 0,
    similarityScore: null,
    promptPreview: previewText(`${instructions}\n${message}`),
  });

  const payload = await fetchJsonWithTimeout({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      providerConfig.model
    )}:generateContent?key=${encodeURIComponent(providerConfig.apiKey)}`,
    providerConfig,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: instructions }],
        },
        contents: toGeminiContents(contextMessages, message),
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: EDUCATIONAL_TEMPERATURE,
        },
      }),
    },
  });

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!text) {
    throw new AiProviderError("empty_response", "AI provider returned an empty response.", {
      provider: providerConfig.provider,
      model: providerConfig.model,
      retryable: true,
    });
  }

  learningAssistantTrace("Learning Assistant Gemini response received", {
    provider: providerConfig.provider,
    model: providerConfig.model,
    detectedTopic: topic?.id || null,
    responsePreview: previewText(text),
  });

  return text;
};

const requestProviderOnce = (args) => {
  if (args.providerConfig.provider === "gemini") {
    return requestGeminiResponse(args);
  }

  return requestOpenAiResponse(args);
};

const requestModelResponse = async ({ contextMessages, message, user, topic, contextRequired }) => {
  const providerConfig = configuredProvider();

  if (!providerConfig.apiKey) {
    const error = new AiProviderError("missing_key", "Learning Assistant AI key missing", {
      provider: providerConfig.provider,
      model: providerConfig.model,
    });
    logger.warn("Learning Assistant AI key missing", safeProviderError(error));
    const fallbackContent = generateFallbackResponse({ message, topic });
    const validation = validateTopicAnswer({ question: message, answer: fallbackContent, topic });
    return {
      content: fallbackContent,
      mode: "fallback",
      reason: error.reason,
      topic,
      validation,
    };
  }

  if (typeof fetch !== "function") {
    const error = new AiProviderError("fetch_unavailable", "Global fetch is unavailable in this Node runtime.", {
      provider: providerConfig.provider,
      model: providerConfig.model,
    });
    logger.warn("Learning Assistant fetch unavailable; using local fallback", safeProviderError(error));
    const fallbackContent = generateFallbackResponse({ message, topic });
    const validation = validateTopicAnswer({ question: message, answer: fallbackContent, topic });
    return {
      content: fallbackContent,
      mode: "fallback",
      reason: error.reason,
      topic,
      validation,
    };
  }

  const maxRetries = Math.max(0, Number(env.learningAssistantMaxRetries) || 0);
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const content = await requestProviderOnce({
        contextMessages,
        message,
        user,
        providerConfig,
        topic,
        contextRequired,
      });
      const validation = validateTopicAnswer({ question: message, answer: content, topic });

      learningAssistantTrace("Learning Assistant response validation completed", {
        detectedTopic: topic?.id || null,
        validationResult: validation.valid,
        validationReason: validation.reason,
        conflictingTopics: validation.conflictingTopics,
      });

      if (!validation.valid) {
        const error = new AiProviderError(
          "topic_mismatch",
          "AI provider response did not match the requested topic.",
          {
            provider: providerConfig.provider,
            model: providerConfig.model,
            retryable: false,
          }
        );
        logger.warn("Learning Assistant response rejected; using local fallback", {
          ...safeProviderError(error),
          detectedTopic: topic?.id || null,
          validationReason: validation.reason,
          conflictingTopics: validation.conflictingTopics,
          rejectedResponsePreview: previewText(content),
        });
        throw error;
      }

      return {
        content,
        mode: "ai",
        provider: providerConfig.provider,
        topic,
        validation,
      };
    } catch (error) {
      lastError = error;
      const shouldRetry = error.retryable && attempt < maxRetries;
      logger.warn(
        shouldRetry
          ? "Learning Assistant AI provider attempt failed; retrying"
          : "Learning Assistant AI provider failed; using local fallback",
        {
          ...safeProviderError(error),
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
        }
      );

      if (shouldRetry) {
        await sleep(300 * (attempt + 1));
      }
    }
  }

  const fallbackContent = generateFallbackResponse({ message, topic });
  const fallbackValidation = validateTopicAnswer({ question: message, answer: fallbackContent, topic });

  learningAssistantTrace("Learning Assistant fallback response prepared", {
    detectedTopic: topic?.id || null,
    validationResult: fallbackValidation.valid,
    validationReason: fallbackValidation.reason,
  });

  return {
    content: fallbackContent,
    mode: "fallback",
    reason: lastError?.reason || "provider_failed",
    topic,
    validation: fallbackValidation,
  };
};

const getAssistantReply = async ({ message, user }) => {
  const topic = detectLearningTopic(message);
  const contextRequired = isContextRequired(message);

  learningAssistantTrace("Learning Assistant topic detected", {
    detectedTopic: topic?.id || null,
    detectedTopicLabel: topic?.label || null,
    matchedAlias: topic?.matchedAlias || null,
    contextRequired,
    retrievalUsed: false,
    retrievedDocuments: 0,
    similarityScore: null,
    questionPreview: previewText(message),
  });

  if (isVagueQuestion(message)) {
    return {
      content: clarificationFor(message),
      mode: "clarification",
      topic,
    };
  }

  const history = await getHistory(user._id);
  const contextMessages = contextRequired
    ? filterHistoryForTopic(history, topic).slice(-MAX_CONTEXT_MESSAGES)
    : [];

  learningAssistantTrace("Learning Assistant context prepared", {
    detectedTopic: topic?.id || null,
    contextRequired,
    historyMessagesAvailable: history.length,
    contextMessagesUsed: contextMessages.length,
    retrievalUsed: false,
    retrievedDocuments: 0,
    similarityScore: null,
  });

  return requestModelResponse({
    contextMessages,
    message,
    user,
    topic,
    contextRequired,
  });
};

const getHealth = () => {
  const providerConfig = configuredProvider();
  const keyConfigured = Boolean(providerConfig.apiKey);
  const fetchAvailable = typeof fetch === "function";

  return {
    status: keyConfigured && fetchAvailable ? "ok" : "degraded",
    route: "/api/learning-assistant",
    chatRoute: "POST /api/learning-assistant/chat",
    provider: providerConfig.provider,
    model: providerConfig.model,
    keyConfigured,
    fetchAvailable,
    fallbackAvailable: true,
    fallbackTopics: FALLBACK_TOPICS,
    topicGuardAvailable: true,
    retrievalUsed: false,
    retrievalNote: "Learning Assistant does not use vector/RAG retrieval in this codebase.",
  };
};

module.exports = {
  TEMPORARILY_UNAVAILABLE,
  clearHistory,
  getAssistantReply,
  getHistory,
  getHealth,
  isVagueQuestion,
  recordExchange,
};
