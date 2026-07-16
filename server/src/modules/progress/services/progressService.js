const Progress = require("../../../models/Progress");
const StudyActivity = require("../../../models/StudyActivity");
const StudyPlan = require("../../../models/StudyPlan");
const User = require("../../../models/User");
const {
  addDaysToDateKey,
  dateFromLocalDateKey,
  daysBetweenDateKeys,
  getLocalDateKey,
} = require("../../../utils/dateKeys");

const normalizeDate = (input = new Date()) => {
  return dateFromLocalDateKey(getLocalDateKey(input));
};

const daysBetween = (laterDate, earlierDate) =>
  Math.max(0, daysBetweenDateKeys(getLocalDateKey(laterDate), getLocalDateKey(earlierDate)));

const buildSubjectBreakdownFromEntries = (entries = []) => {
  const buckets = new Map();

  entries.forEach((entry) => {
    const current = buckets.get(entry.subject) || {
      subject: entry.subject,
      completed: 0,
      total: 0,
    };

    current.total += 1;
    if (entry.completed) {
      current.completed += 1;
    }

    buckets.set(entry.subject, current);
  });

  return Array.from(buckets.values()).sort((left, right) =>
    left.subject.localeCompare(right.subject)
  );
};

const calculateProgressRateFromEntries = (entries = []) => {
  if (entries.length === 0) {
    return 0;
  }

  const totalRate = entries.reduce(
    (sum, entry) => sum + (Number(entry.progressRate) || 0),
    0
  );

  return Math.round(totalRate / entries.length);
};

const calculateCurrentStreakFromDateKeys = (dateKeys = [], referenceDate = new Date()) => {
  const uniqueDateKeys = Array.from(new Set(dateKeys.filter(Boolean))).sort().reverse();

  if (uniqueDateKeys.length === 0) {
    return 0;
  }

  const todayKey = getLocalDateKey(referenceDate);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  let expectedDateKey;

  if (uniqueDateKeys[0] === todayKey) {
    expectedDateKey = todayKey;
  } else if (uniqueDateKeys[0] === yesterdayKey) {
    expectedDateKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;

  for (const dateKey of uniqueDateKeys) {
    if (dateKey !== expectedDateKey) {
      break;
    }

    streak += 1;
    expectedDateKey = addDaysToDateKey(expectedDateKey, -1);
  }

  return streak;
};

const syncUserStreak = async (userId) => {
  const activityDateKeys = await StudyActivity.distinct("dateKey", {
    user: userId,
    completed: true,
  });

  const fallbackProgress = activityDateKeys.length
    ? []
    : await Progress.find({
        user: userId,
        completedTasks: { $gt: 0 },
      })
        .sort({ date: -1 })
        .select("date dateKey completedTasks");

  const dateKeys = activityDateKeys.length
    ? activityDateKeys
    : fallbackProgress.map((item) => item.dateKey || getLocalDateKey(item.date));
  const streak = calculateCurrentStreakFromDateKeys(dateKeys);
  const lastActiveDateKey = Array.from(new Set(dateKeys)).sort().reverse()[0] || null;

  await User.findByIdAndUpdate(userId, {
    currentStreak: streak,
    lastActiveOn: lastActiveDateKey ? dateFromLocalDateKey(lastActiveDateKey) : null,
  });

  return streak;
};

const buildProgressOverview = async (userId) => {
  const [progressDocuments, studyPlans, user, activityDateKeys] = await Promise.all([
    Progress.find({ user: userId })
      .sort({ date: -1 })
      .select("date dateKey totalTasks completedTasks completionRate subjectBreakdown entries"),
    StudyPlan.find({ user: userId }).select(
      "totalTasks completedTasks completionRate"
    ),
    User.findById(userId).select("currentStreak"),
    StudyActivity.distinct("dateKey", { user: userId, completed: true }),
  ]);

  const overview = studyPlans.reduce(
    (accumulator, plan) => {
      accumulator.totalTasks += plan.totalTasks;
      accumulator.completedTasks += plan.completedTasks;
      return accumulator;
    },
    { totalTasks: 0, completedTasks: 0 }
  );

  const subjectMomentumMap = new Map();

  progressDocuments.forEach((document) => {
    document.subjectBreakdown.forEach((item) => {
      const current = subjectMomentumMap.get(item.subject) || {
        subject: item.subject,
        completed: 0,
        total: 0,
      };

      current.completed += item.completed;
      current.total += item.total;
      subjectMomentumMap.set(item.subject, current);
    });
  });

  const quizScores = progressDocuments.flatMap((document) =>
    document.entries
      .filter((entry) => typeof entry.quizScore === "number")
      .map((entry) => ({
        subject: entry.subject,
        score: entry.quizScore,
      }))
  );

  const subjectQuizMap = new Map();
  quizScores.forEach((entry) => {
    const current = subjectQuizMap.get(entry.subject) || {
      subject: entry.subject,
      totalScore: 0,
      attempts: 0,
    };

    current.totalScore += entry.score;
    current.attempts += 1;
    subjectQuizMap.set(entry.subject, current);
  });

  const quizPerformance = Array.from(subjectQuizMap.values()).map((item) => ({
    subject: item.subject,
    averageScore: Math.round(item.totalScore / item.attempts),
    attempts: item.attempts,
  }));

  const subjectMomentum = Array.from(subjectMomentumMap.values())
    .map((item) => ({
      ...item,
      completionRate:
        item.total === 0 ? 0 : Math.round((item.completed / item.total) * 100),
    }))
    .sort((left, right) => right.completionRate - left.completionRate)
    .slice(0, 6);

  const fallbackActiveDateKeys = progressDocuments
    .filter((item) => item.completedTasks > 0)
    .map((item) => item.dateKey || getLocalDateKey(item.date));
  const activeDateKeys = activityDateKeys.length
    ? activityDateKeys
    : fallbackActiveDateKeys;
  const activeDays = new Set(activeDateKeys).size;
  const currentStreak = calculateCurrentStreakFromDateKeys(activeDateKeys);
  const lastActiveDate = Array.from(new Set(activeDateKeys)).sort().reverse()[0] || null;
  const completionRate =
    overview.totalTasks === 0
      ? 0
      : Math.round((overview.completedTasks / overview.totalTasks) * 100);

  if ((user?.currentStreak || 0) !== currentStreak) {
    await User.findByIdAndUpdate(userId, { currentStreak });
  }

  return {
    overview: {
      totalTasks: overview.totalTasks,
      completedTasks: overview.completedTasks,
      completionRate,
      overallProgress: completionRate,
      activeDays,
      totalStudyPlans: studyPlans.length,
      currentStreak,
      lastActiveDate,
      subjectMomentum,
      strengths: quizPerformance
        .filter((item) => item.averageScore >= 75)
        .sort((left, right) => right.averageScore - left.averageScore)
        .slice(0, 3),
      weaknesses: quizPerformance
        .filter((item) => item.averageScore < 60)
        .sort((left, right) => left.averageScore - right.averageScore)
        .slice(0, 3),
    },
    recentActivity: progressDocuments.slice(0, 7).map((item) => ({
      date: item.dateKey || getLocalDateKey(item.date),
      completedTasks: item.completedTasks,
      totalTasks: item.totalTasks,
      completionRate: item.completionRate,
    })),
  };
};

const buildProgressSummary = async (userId) => {
  const { overview } = await buildProgressOverview(userId);

  return {
    overallProgress: overview.overallProgress || overview.completionRate || 0,
    activeDays: overview.activeDays || 0,
    currentStreak: overview.currentStreak || 0,
    completedItems: overview.completedTasks || 0,
    totalItems: overview.totalTasks || 0,
    lastActiveDate: overview.lastActiveDate || null,
  };
};

const recordStudyActivity = async ({
  userId,
  studyPlanId,
  taskId,
  type = "manual",
  completedAt = new Date(),
  dateKey = getLocalDateKey(completedAt),
}) => {
  const activityDateKey = getLocalDateKey(dateKey || completedAt);
  const insertFields = {
    user: userId,
    studyPlan: studyPlanId,
  };

  if (taskId) {
    insertFields.task = taskId;
  }

  const activity = await StudyActivity.findOneAndUpdate(
    taskId
      ? { user: userId, task: taskId }
      : { user: userId, dateKey: activityDateKey, type },
    {
      $setOnInsert: insertFields,
      $set: {
        dateKey: activityDateKey,
        type,
        completed: true,
        completedAt,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await syncUserStreak(userId);
  return activity;
};

module.exports = {
  normalizeDate,
  getLocalDateKey,
  daysBetween,
  buildSubjectBreakdownFromEntries,
  calculateProgressRateFromEntries,
  calculateCurrentStreakFromDateKeys,
  recordStudyActivity,
  syncUserStreak,
  buildProgressOverview,
  buildProgressSummary,
};
