const express = require("express");
const {
  completeStudyPlanTask,
  generateStudyPlan,
  getStudyPlan,
  getSubjects,
  solveProblemForUser,
} = require("./taskController");
const authenticate = require("../../middleware/auth");
const requireDatabase = require("../../middleware/requireDatabase");
const validateRequest = require("../../middleware/validate");
const {
  completeTaskValidation,
  generatePlanValidation,
  getPlanValidation,
  solveProblemValidation,
} = require("./taskValidation");

const router = express.Router();

router.use(requireDatabase);
router.use(authenticate);
router.get("/", getPlanValidation, validateRequest, getStudyPlan);
router.post("/generate", generatePlanValidation, validateRequest, generateStudyPlan);
router.patch(
  "/task/:taskId/complete",
  completeTaskValidation,
  validateRequest,
  completeStudyPlanTask
);
router.get("/subjects", getSubjects);
router.post("/solve", solveProblemValidation, validateRequest, solveProblemForUser);

module.exports = router;
