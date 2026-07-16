const asyncHandler = require("../../utils/asyncHandler");
const internshipPrepService = require("./internshipPrep.service");

const sendData = (loader) =>
  asyncHandler(async (_req, res) => {
    res.json({ data: loader() });
  });

module.exports = {
  getAptitude: sendData(internshipPrepService.getAptitude),
  getCompanyPrep: sendData(internshipPrepService.getCompanyPrep),
  getQuestions: sendData(internshipPrepService.getQuestions),
  getResumeGuide: sendData(internshipPrepService.getResumeGuide),
  getRoadmaps: sendData(internshipPrepService.getRoadmaps),
};
