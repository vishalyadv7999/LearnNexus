const express = require("express");
const {
  getProgressSummaryForUser,
  getProgressOverviewForUser,
  recordActivityForUser,
  updateTaskProgress,
  updateVideoProgress,
} = require("./progressController");
const authenticate = require("../../middleware/auth");
const requireDatabase = require("../../middleware/requireDatabase");
const validateRequest = require("../../middleware/validate");
const {
  recordActivityValidation,
  updateProgressValidation,
  updateVideoProgressValidation,
} = require("./progressValidation");

const router = express.Router();

router.use(requireDatabase);
router.use(authenticate);
router.get("/summary", getProgressSummaryForUser);
router.post("/activity", recordActivityValidation, validateRequest, recordActivityForUser);
router.get("/", getProgressOverviewForUser);
router.patch(
  "/videos/:videoId",
  updateVideoProgressValidation,
  validateRequest,
  updateVideoProgress
);
router.patch("/:taskId", updateProgressValidation, validateRequest, updateTaskProgress);

module.exports = router;
