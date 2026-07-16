const ApiError = require("../../utils/apiError");
const { resolveChannel } = require("../../data/recommendationCatalog");
const Progress = require("../../models/Progress");
const StudyPlan = require("../../models/StudyPlan");
const Task = require("../../models/Task");
const User = require("../../models/User");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  course: user.course,
  year: user.year,
  role: user.role || "student",
  isAdmin: user.role === "admin",
  currentStreak: user.currentStreak,
  lastActiveOn: user.lastActiveOn,
  preferences: user.preferences,
  createdAt: user.createdAt,
});

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User account no longer exists.");
    }

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const normalizePreferredChannels = (preferredChannels = []) =>
  preferredChannels
    .map((channel) => resolveChannel(channel)?.id || String(channel || "").trim())
    .filter(Boolean);

const normalizeListForSignature = (values = []) =>
  values.map((value) => String(value || "").trim()).filter(Boolean).sort();

const getPreferenceSignature = (user) =>
  JSON.stringify({
    course: user.course || "",
    videoLanguage: user.preferences?.videoLanguage || "English",
    preferredChannels: normalizeListForSignature(user.preferences?.preferredChannels || []),
    preferredSubjects: normalizeListForSignature(user.preferences?.preferredSubjects || []),
  });

const clearIncompleteStudyPlansForPreferenceChange = async (userId) => {
  const plans = await StudyPlan.find({
    user: userId,
    completedTasks: 0,
  }).select("_id");

  const planIds = plans.map((plan) => plan._id);

  if (!planIds.length) {
    return;
  }

  // Incomplete generated plans are safe to refresh when the selected
  // field/creator/language changes. This prevents stale cards from an older
  // creator or field from surviving under the new heading.
  await Promise.all([
    Task.deleteMany({ studyPlan: { $in: planIds } }),
    Progress.deleteMany({ studyPlan: { $in: planIds } }),
    StudyPlan.deleteMany({ _id: { $in: planIds } }),
  ]);
};

const updatePreferences = async (req, res, next) => {
  try {
    const {
      course,
      studyMinutesPerDay,
      focusMode,
      preferredChannels,
      preferredSubjects,
      videoLanguage,
    } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User account no longer exists.");
    }

    const previousPreferenceSignature = getPreferenceSignature(user);

    if (typeof course !== "undefined") {
      user.course = course;
      user.year = 1;
    }

    user.preferences.studyMinutesPerDay = 60;

    if (typeof studyMinutesPerDay !== "undefined") {
      user.preferences.studyMinutesPerDay = Math.min(studyMinutesPerDay, 60);
    }

    if (typeof focusMode !== "undefined") {
      user.preferences.focusMode = focusMode;
    }

    if (Array.isArray(preferredChannels)) {
      user.preferences.preferredChannels = normalizePreferredChannels(preferredChannels);
    }

    if (Array.isArray(preferredSubjects)) {
      user.preferences.preferredSubjects = preferredSubjects;
    }

    if (typeof videoLanguage !== "undefined") {
      user.preferences.videoLanguage = videoLanguage;
    }

    await user.save();

    if (previousPreferenceSignature !== getPreferenceSignature(user)) {
      await clearIncompleteStudyPlansForPreferenceChange(user._id);
    }

    res.json({
      message: "Preferences updated.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updatePreferences,
};
