const { body, param } = require("express-validator");

const allowedResources = ["channels", "playlists", "videos"];

const recommendationResourceValidation = [
  param("resource")
    .isIn(allowedResources)
    .withMessage("Recommendation resource must be channels, playlists, or videos."),
];

const upsertRecommendationValidation = [
  body("language")
    .optional()
    .isIn(["Hindi", "English"])
    .withMessage("Language must be Hindi or English."),
  body("verified")
    .optional()
    .isBoolean()
    .withMessage("Verified must be true or false."),
  body("subjects")
    .optional()
    .isArray()
    .withMessage("Subjects must be an array."),
  body("semesters")
    .optional()
    .isArray()
    .withMessage("Semesters must be an array."),
  body("branches")
    .optional()
    .isArray()
    .withMessage("Branches must be an array."),
];

const verifyRecommendationValidation = [
  param("id").isMongoId().withMessage("Resource ID must be valid."),
  body("verified")
    .optional()
    .isBoolean()
    .withMessage("Verified must be true or false."),
];

const playlistImportValidation = [
  body()
    .custom((value) => Boolean(value.playlistUrl || value.youtubePlaylistId))
    .withMessage("playlistUrl or youtubePlaylistId is required."),
  body("channelId")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("channelId must be a non-empty string."),
  body("creatorName")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("creatorName must be a non-empty string."),
  body("subject")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("subject must be a non-empty string."),
  body("semester")
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage("semester must be between 1 and 8."),
  body("language")
    .optional()
    .isIn(["Hindi", "English"])
    .withMessage("Language must be Hindi or English."),
  body("maxPages")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("maxPages must be between 1 and 1000."),
];

const continuePlaylistImportValidation = [
  param("id").isString().trim().notEmpty().withMessage("Playlist id is required."),
  body("maxPages")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("maxPages must be between 1 and 1000."),
];

module.exports = {
  continuePlaylistImportValidation,
  playlistImportValidation,
  recommendationResourceValidation,
  upsertRecommendationValidation,
  verifyRecommendationValidation,
};
