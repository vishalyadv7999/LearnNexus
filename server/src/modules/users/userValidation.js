const { body } = require("express-validator");
const { getAvailableCourseNames } = require("../../services/curriculumService");
const {
  channelSupportsLanguage,
  getAllSubjects,
  resolveChannel,
  resolveSubjectTag,
} = require("../../data/recommendationCatalog");

const verifiedSubjectIds = new Set(getAllSubjects().map((subject) => subject.id));

const updatePreferencesValidation = [
  body("course")
    .optional()
    .trim()
    .custom((value) => {
      if (!getAvailableCourseNames().includes(value)) {
        throw new Error("Please select one of the available fields.");
      }

      return true;
    }),
  body("studyMinutesPerDay")
    .optional()
    .isInt({ min: 60, max: 60 })
    .withMessage("Daily learning time is fixed at 1 hour."),
  body("focusMode")
    .optional()
    .isBoolean()
    .withMessage("Focus mode must be true or false."),
  body("preferredChannels")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Choose up to 5 preferred channels."),
  body("preferredChannels.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Channel names must be between 2 and 80 characters.")
    .custom((value, { req }) => {
      const channel = resolveChannel(value);

      if (!channel) {
        throw new Error("Choose a verified LearnNexus channel.");
      }

      if (req.body.videoLanguage && !channelSupportsLanguage(channel, req.body.videoLanguage)) {
        throw new Error("Channel language must match your selected language.");
      }

      return true;
    }),
  body("preferredSubjects")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Choose up to 5 subjects."),
  body("preferredSubjects.*")
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Subject names must be between 2 and 120 characters.")
    .custom((value) => {
      if (!verifiedSubjectIds.has(resolveSubjectTag(value))) {
        throw new Error("Choose a verified LearnNexus subject.");
      }

      return true;
    }),
  body("videoLanguage")
    .optional()
    .isIn(["English", "Hindi"])
    .withMessage("Choose Hindi or English."),
];

module.exports = {
  updatePreferencesValidation,
};
