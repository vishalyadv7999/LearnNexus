const express = require("express");
const rateLimit = require("express-rate-limit");
const authenticate = require("../../middleware/auth");
const requireDatabase = require("../../middleware/requireDatabase");
const validateRequest = require("../../middleware/validate");
const controller = require("./learningAssistant.controller");
const { chatValidation } = require("./learningAssistant.validation");

const router = express.Router();
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "You have sent several questions quickly. Please wait a moment and try again.",
  },
});

router.get("/health", controller.health);

router.use(requireDatabase);
router.use(authenticate);
router.post("/chat", chatLimiter, chatValidation, validateRequest, controller.chat);
router.get("/history", controller.getHistory);
router.delete("/history", controller.clearHistory);

module.exports = router;
