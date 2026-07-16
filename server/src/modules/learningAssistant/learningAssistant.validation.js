const { body } = require("express-validator");

const MAX_MESSAGE_LENGTH = 2000;

const normalizeMessage = (value) =>
  String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

const chatValidation = [
  body("message")
    .isString()
    .withMessage("Message must be text.")
    .bail()
    .customSanitizer(normalizeMessage)
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH })
    .withMessage(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`),
];

module.exports = {
  chatValidation,
  MAX_MESSAGE_LENGTH,
  normalizeMessage,
};
