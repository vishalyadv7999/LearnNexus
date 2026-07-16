const {
  completeTask,
  getStudyPlanBundle,
  getSubjectsBundle,
  solveProblem,
} = require("./services/studyPlanService");
const { getLearningFlow } = require("./services/learningFlowService");

const getStudyPlan = async (req, res, next) => {
  try {
    const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
    const [planBundle, learningFlow] = await Promise.all([
      getStudyPlanBundle(req.user, selectedDate),
      getLearningFlow(req.user),
    ]);

    res.json({
      ...planBundle,
      learningFlow,
    });
  } catch (error) {
    next(error);
  }
};

const generateStudyPlan = async (req, res, next) => {
  try {
    const selectedDate = req.body.date ? new Date(req.body.date) : new Date();
    const [planBundle, learningFlow] = await Promise.all([
      getStudyPlanBundle(req.user, selectedDate),
      getLearningFlow(req.user),
    ]);

    res.status(201).json({
      ...planBundle,
      learningFlow,
    });
  } catch (error) {
    next(error);
  }
};

const completeStudyPlanTask = async (req, res, next) => {
  try {
    const result = await completeTask(req.user, req.params.taskId, req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const subjectBundle = getSubjectsBundle(req.user);

    res.json(subjectBundle);
  } catch (error) {
    next(error);
  }
};

const solveProblemForUser = async (req, res, next) => {
  try {
    const results = await solveProblem(req.user, req.body.query);

    res.json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  completeStudyPlanTask,
  generateStudyPlan,
  getStudyPlan,
  getSubjects,
  solveProblemForUser,
};
