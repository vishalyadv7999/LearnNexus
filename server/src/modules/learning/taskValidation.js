const { body, param, query } = require("express-validator");
const { DATE_KEY_PATTERN } = require("../../utils/dateKeys");

const getPlanValidation = [
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Date must use ISO format, for example 2026-04-25."),
];

const generatePlanValidation = [
  body("date")
    .optional()
    .matches(DATE_KEY_PATTERN)
    .withMessage("Date must use YYYY-MM-DD format."),
];

const completeTaskValidation = [
  param("taskId").isMongoId().withMessage("Task ID must be valid."),
  body("watchSeconds")
    .optional()
    .isInt({ min: 0, max: 10800 })
    .withMessage("Watch time must be between 0 and 10800 seconds."),
  body("quizScore")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Quiz score must be between 0 and 100."),
  body("dateKey")
    .optional()
    .matches(DATE_KEY_PATTERN)
    .withMessage("Date key must use YYYY-MM-DD format."),
  body("activityDate")
    .optional()
    .matches(DATE_KEY_PATTERN)
    .withMessage("Activity date must use YYYY-MM-DD format."),
];

const solveProblemValidation = [
  body("query")
    .trim()
    .isLength({ min: 3, max: 160 })
    .withMessage("Enter a topic or doubt between 3 and 160 characters."),
];

module.exports = {
  completeTaskValidation,
  generatePlanValidation,
  getPlanValidation,
  solveProblemValidation,
};
