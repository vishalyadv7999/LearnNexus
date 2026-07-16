const asyncHandler = require("../../utils/asyncHandler");
const learningAssistantService = require("./learningAssistant.service");

const chat = asyncHandler(async (req, res) => {
  const assistantReply = await learningAssistantService.getAssistantReply({
    message: req.body.message,
    user: req.user,
  });
  const messages = await learningAssistantService.recordExchange(
    req.user._id,
    req.body.message,
    assistantReply.content
  );

  res.status(201).json({
    messages,
    mode: assistantReply.mode,
    reason: assistantReply.reason,
    topic: assistantReply.topic
      ? {
          id: assistantReply.topic.id,
          label: assistantReply.topic.label,
          domain: assistantReply.topic.domain,
        }
      : null,
    validation: assistantReply.validation
      ? {
          valid: assistantReply.validation.valid,
          reason: assistantReply.validation.reason,
          conflictingTopics: assistantReply.validation.conflictingTopics,
        }
      : null,
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const messages = await learningAssistantService.getHistory(req.user._id);
  res.json({ messages });
});

const clearHistory = asyncHandler(async (req, res) => {
  await learningAssistantService.clearHistory(req.user._id);
  res.json({ message: "Learning Assistant history cleared." });
});

const health = asyncHandler(async (_req, res) => {
  res.json(learningAssistantService.getHealth());
});

module.exports = { chat, clearHistory, getHistory, health };
