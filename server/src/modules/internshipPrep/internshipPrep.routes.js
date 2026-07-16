const express = require("express");
const controller = require("./internshipPrep.controller");

const router = express.Router();

router.get("/roadmaps", controller.getRoadmaps);
router.get("/questions", controller.getQuestions);
router.get("/resume-guide", controller.getResumeGuide);
router.get("/aptitude", controller.getAptitude);
router.get("/company-prep", controller.getCompanyPrep);

module.exports = router;
