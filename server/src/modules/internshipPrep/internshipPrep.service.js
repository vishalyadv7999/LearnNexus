const data = require("./internshipPrep.data");

const clone = (value) => JSON.parse(JSON.stringify(value));

const getRoadmaps = () => clone(data.roadmaps);
const getQuestions = () => clone(data.questions);
const getResumeGuide = () => clone(data.resumeGuide);
const getAptitude = () => clone(data.aptitude);
const getCompanyPrep = () => clone(data.companyPrep);

module.exports = {
  getAptitude,
  getCompanyPrep,
  getQuestions,
  getResumeGuide,
  getRoadmaps,
};
