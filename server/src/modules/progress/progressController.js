const {
  buildProgressOverview,
  buildProgressSummary,
  recordStudyActivity,
} = require("./services/progressService");
const {
  getNextPlaylistVideosForState,
  updateVideoLearningState,
} = require("../learning/services/learningFlowService");
const { setTaskProgress } = require("../learning/services/studyPlanService");

const getProgressOverviewForUser = async (req, res, next) => {
  try {
    const progressOverview = await buildProgressOverview(req.user._id);
    res.json(progressOverview);
  } catch (error) {
    next(error);
  }
};

const getProgressSummaryForUser = async (req, res, next) => {
  try {
    const progressSummary = await buildProgressSummary(req.user._id);
    res.json(progressSummary);
  } catch (error) {
    next(error);
  }
};

const recordActivityForUser = async (req, res, next) => {
  try {
    await recordStudyActivity({
      userId: req.user._id,
      type: req.body.type || "manual",
      dateKey: req.body.date,
      completedAt: req.body.completedAt ? new Date(req.body.completedAt) : new Date(),
    });
    const progressSummary = await buildProgressSummary(req.user._id);
    res.status(201).json(progressSummary);
  } catch (error) {
    next(error);
  }
};

const updateTaskProgress = async (req, res, next) => {
  try {
    const result = await setTaskProgress(req.user, req.params.taskId, req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const updateVideoProgress = async (req, res, next) => {
  try {
    const videoState = await updateVideoLearningState(req.user, {
      ...req.body,
      youtubeVideoId: req.params.videoId,
    });
    const continuation = await getNextPlaylistVideosForState(req.user, videoState);

    res.json({ videoState, ...continuation });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProgressSummaryForUser,
  getProgressOverviewForUser,
  recordActivityForUser,
  updateTaskProgress,
  updateVideoProgress,
};
