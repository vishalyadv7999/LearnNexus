const { body, param } = require("express-validator");
const { DATE_KEY_PATTERN } = require("../../utils/dateKeys");

const updateProgressValidation = [
  param("taskId").isMongoId().withMessage("Task ID must be valid."),
  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be a true or false value."),
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

const recordActivityValidation = [
  body("date")
    .optional()
    .matches(DATE_KEY_PATTERN)
    .withMessage("Date must use YYYY-MM-DD format."),
  body("completedAt")
    .optional()
    .isISO8601()
    .withMessage("Completed time must be a valid ISO date."),
  body("type")
    .optional()
    .isIn(["manual", "task_completed", "video_completed"])
    .withMessage("Activity type must be valid."),
];

const updateVideoProgressValidation = [
  param("videoId")
    .isString()
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage("Video ID must be valid."),
  body("currentSeconds")
    .optional()
    .isInt({ min: 0, max: 86400 })
    .withMessage("Current video time must be between 0 and 86400 seconds."),
  body("durationSeconds")
    .optional()
    .isInt({ min: 0, max: 86400 })
    .withMessage("Video duration must be between 0 and 86400 seconds."),
  body("percent")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Video percent must be between 0 and 100."),
  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be true or false."),
  body("bookmarked")
    .optional()
    .isBoolean()
    .withMessage("Bookmarked must be true or false."),
  body("video")
    .optional()
    .isObject()
    .withMessage("Video metadata must be an object."),
];

module.exports = {
  recordActivityValidation,
  updateProgressValidation,
  updateVideoProgressValidation,
};
