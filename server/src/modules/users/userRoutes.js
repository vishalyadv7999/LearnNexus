const express = require("express");
const {
  getCurrentUser,
  updatePreferences,
} = require("./userController");
const authenticate = require("../../middleware/auth");
const requireDatabase = require("../../middleware/requireDatabase");
const validateRequest = require("../../middleware/validate");
const {
  updatePreferencesValidation,
} = require("./userValidation");

const router = express.Router();

router.use(requireDatabase);
router.use(authenticate);
router.get("/me", getCurrentUser);
router.patch(
  "/me/preferences",
  updatePreferencesValidation,
  validateRequest,
  updatePreferences
);

module.exports = router;
