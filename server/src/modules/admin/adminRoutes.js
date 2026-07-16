const express = require("express");
const {
  cleanupRecommendationResources,
  continuePlaylistResourceImport,
  importPlaylistResource,
  listResources,
  removeResource,
  upsertResource,
  verifyResource,
} = require("./adminRecommendationController");
const authenticate = require("../../middleware/auth");
const requireDatabase = require("../../middleware/requireDatabase");
const requireRole = require("../../middleware/requireRole");
const validateRequest = require("../../middleware/validate");
const {
  continuePlaylistImportValidation,
  playlistImportValidation,
  recommendationResourceValidation,
  upsertRecommendationValidation,
  verifyRecommendationValidation,
} = require("./adminValidation");

const router = express.Router();

router.use(requireDatabase);
router.use(authenticate);
router.use(requireRole("admin"));

router.post(
  "/playlist-imports",
  playlistImportValidation,
  validateRequest,
  importPlaylistResource
);
router.post(
  "/playlist-imports/:id/continue",
  continuePlaylistImportValidation,
  validateRequest,
  continuePlaylistResourceImport
);
router.post("/recommendations/cleanup", cleanupRecommendationResources);
router.get(
  "/recommendations/:resource",
  recommendationResourceValidation,
  validateRequest,
  listResources
);
router.post(
  "/recommendations/:resource",
  recommendationResourceValidation,
  upsertRecommendationValidation,
  validateRequest,
  upsertResource
);
router.patch(
  "/recommendations/:resource/:id/verify",
  recommendationResourceValidation,
  verifyRecommendationValidation,
  validateRequest,
  verifyResource
);
router.delete(
  "/recommendations/:resource/:id",
  recommendationResourceValidation,
  validateRequest,
  removeResource
);

module.exports = router;
