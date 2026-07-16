import api from "../../../services/apiClient";

export const MAX_ASSISTANT_MESSAGE_LENGTH = 2000;
const ASSISTANT_CHAT_TIMEOUT_MS = 60000;

const logLearningAssistantError = (operation, error) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console.warn("[LearningAssistant]", operation, {
    status: error.response?.status,
    requestId: error.response?.data?.requestId,
    message: error.response?.data?.message || error.message,
    url: error.config?.url,
    method: error.config?.method,
  });
};

const withAssistantLogging = async (operation, request) => {
  try {
    return await request();
  } catch (error) {
    logLearningAssistantError(operation, error);
    throw error;
  }
};

export const fetchLearningAssistantHealth = () =>
  withAssistantLogging("health", () => api.get("/learning-assistant/health"));

export const fetchLearningAssistantHistory = () =>
  withAssistantLogging("history", () => api.get("/learning-assistant/history"));

export const sendLearningAssistantMessage = (message) =>
  withAssistantLogging("chat", () =>
    api.post(
      "/learning-assistant/chat",
      { message: String(message || "") },
      { timeout: ASSISTANT_CHAT_TIMEOUT_MS }
    )
  );

export const clearLearningAssistantHistory = () =>
  withAssistantLogging("clear-history", () => api.delete("/learning-assistant/history"));
