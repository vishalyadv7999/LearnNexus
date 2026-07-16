const Progress = require("../../../models/Progress");
const StudyPlan = require("../../../models/StudyPlan");
const Task = require("../../../models/Task");
const LearningState = require("../../../models/LearningState");
const Video = require("../../../models/Video");
const {
  getCurriculumForUser,
  getRecommendedChannels,
  getSubjectsForUser,
  getTopicSubjectTags,
  searchSupportResources,
} = require("../../../services/curriculumService");
const { findLectureVideos } = require("../../videos/services/videoSearchService");
const { getSubjectLabel, resolveChannel, resolveSubjectTag } = require("../../../data/recommendationCatalog");
const { findCuratedMapping } = require("../../../data/curatedLearningCatalog");
const {
  normalizeDate,
  daysBetween,
  buildSubjectBreakdownFromEntries,
  calculateProgressRateFromEntries,
  getLocalDateKey,
  recordStudyActivity,
  syncUserStreak,
  buildProgressOverview,
} = require("../../progress/services/progressService");
const ApiError = require("../../../utils/apiError");

const DIFFICULTY_LABELS = {
  1: "Foundation",
  2: "Core",
  3: "Stretch",
  4: "Advanced",
  5: "Capstone",
};
const RECOMMENDATION_VERSION = "strict-topic-catalog-v32-course-scoped-direct-creator-playlists";
const CAREER_FIELD_SUBJECT_TAGS = new Set([
  "machine_learning",
  "data_science",
  "artificial_intelligence",
  "cyber_security",
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeChannels = (channels = []) =>
  channels.map((channel) => channel.trim()).filter(Boolean);

const normalizeSubjects = (subjects = []) =>
  subjects.map((subject) => resolveSubjectTag(subject)).filter(Boolean);

const getChannelSignature = (channels = []) =>
  normalizeChannels(channels)
    .map((channel) => channel.toLowerCase())
    .sort()
    .join("|");

const getSubjectSignature = (subjects = []) =>
  normalizeSubjects(subjects).sort().join("|");

const normalizeCreatorValue = (value = "") => String(value || "").trim().toLowerCase();

const getSelectedCreatorGuard = (preferredChannels = []) => {
  const selectedChannels = normalizeChannels(preferredChannels)
    .map(resolveChannel)
    .filter(Boolean);

  if (selectedChannels.length === 0) {
    return null;
  }

  return {
    ids: new Set(selectedChannels.map((channel) => channel.id).filter(Boolean)),
    channelIds: new Set(
      selectedChannels.map((channel) => channel.youtubeChannelId).filter(Boolean)
    ),
    names: new Set(
      selectedChannels.flatMap((channel) => [
        channel.name,
        ...(Array.isArray(channel.aliases) ? channel.aliases : []),
      ]).map(normalizeCreatorValue)
    ),
  };
};

const taskMatchesSelectedCreator = (task = {}, selectedCreatorGuard) => {
  if (!selectedCreatorGuard) {
    return true;
  }

  if (task.creatorId && selectedCreatorGuard.ids.has(task.creatorId)) {
    return true;
  }

  if (task.videoChannelId && selectedCreatorGuard.channelIds.has(task.videoChannelId)) {
    return true;
  }

  return [
    task.creatorName,
    task.creator,
    task.channelName,
    task.videoChannel,
  ].some((value) => selectedCreatorGuard.names.has(normalizeCreatorValue(value)));
};

const planTasksMatchSelectedCreator = (plan, preferredChannels = []) => {
  const selectedCreatorGuard = getSelectedCreatorGuard(preferredChannels);

  if (!selectedCreatorGuard || !Array.isArray(plan?.tasks) || plan.tasks.length === 0) {
    return true;
  }

  return plan.tasks.every((task) => taskMatchesSelectedCreator(task, selectedCreatorGuard));
};

const getVideoIdFromUrl = (value = "") => {
  const text = String(value || "");
  const watchMatch = text.match(/[?&]v=([^?&/]+)/);
  const embedMatch = text.match(/\/embed\/([^?&/]+)/);
  const shortMatch = text.match(/youtu\.be\/([^?&/]+)/);

  return watchMatch?.[1] || embedMatch?.[1] || shortMatch?.[1] || "";
};

const getTaskVideoId = (task = {}) =>
  task.videoId ||
  getVideoIdFromUrl(task.youtubeLink) ||
  getVideoIdFromUrl(task.videoUrl) ||
  getVideoIdFromUrl(task.videoEmbedUrl);

const getSelectedCuratedStandaloneVideo = ({ course, language, preferredChannels = [] }) =>
  normalizeChannels(preferredChannels)
    .map((creator) => findCuratedMapping({ creator, course, language }))
    .find((mapping) => mapping?.youtubeVideoId && !(mapping.playlistId || mapping.youtubePlaylistId)) ||
  null;

const planTasksMatchSelectedCuratedVideo = ({ plan, course, language, preferredChannels }) => {
  const selectedVideo = getSelectedCuratedStandaloneVideo({
    course,
    language,
    preferredChannels,
  });

  if (!selectedVideo || !Array.isArray(plan?.tasks) || plan.tasks.length === 0) {
    return true;
  }

  return plan.tasks.every((task) => {
    const taskVideoId = getTaskVideoId(task);

    if (taskVideoId && taskVideoId !== selectedVideo.youtubeVideoId) {
      return false;
    }

    const taskUrl = task.youtubeLink || task.videoUrl || "";

    return !taskUrl || taskUrl === selectedVideo.youtubeLink;
  });
};

const createEstimatedMinutes = (dailyMinutes, order, difficultyLevel) => {
  return 60;
};

const toRelatedVideo = (video = {}) => ({
  videoTitle: video.videoTitle || "Related lesson",
  videoUrl: video.videoUrl || "",
  videoEmbedUrl: video.videoEmbedUrl || "",
  videoThumbnailUrl: video.videoThumbnailUrl || "",
  videoChannel: video.videoChannel || "YouTube",
  videoChannelId: video.videoChannelId || "",
  creatorName: video.creatorName || video.videoChannel || "",
  creatorId: video.creatorId || "",
  creator: video.creator || video.creatorName || video.videoChannel || "",
  channelName: video.channelName || video.creatorName || video.videoChannel || "",
  course: video.course || video.subjectName || video.videoSubject || "",
  source: video.source || (video.videoVerified === true ? "verified" : "fallback"),
  videoId: video.videoId || "",
  videoLanguage: video.videoLanguage,
  videoSubject: video.videoSubject || "",
  subjectName: video.subjectName || video.videoSubject || "",
  videoSubjectTag: video.videoSubjectTag || "",
  videoSemester: video.videoSemester,
  videoVerified: video.videoVerified === true,
  playlistTitle: video.playlistTitle || "",
  playlistId: video.playlistId || "",
  playlistPosition:
    typeof video.playlistPosition === "number" ? video.playlistPosition : undefined,
  thumbnail: video.thumbnail || video.videoThumbnailUrl || "",
  youtubeLink: video.youtubeLink || video.videoUrl || "",
  recommendationScore: video.recommendationScore || 0,
  recommendationConfidence: video.recommendationConfidence || "none",
  recommendationReason: video.recommendationReason || "",
  fallbackUsed: video.fallbackUsed === true,
  videoDurationLabel: video.videoDurationLabel || "",
  videoDurationSeconds: video.videoDurationSeconds || 0,
  videoViews: video.videoViews || 0,
});

const dedupeVideos = (videos = []) => {
  const seen = new Set();

  return videos
    .map(toRelatedVideo)
    .filter((video) => video.videoUrl || video.videoEmbedUrl)
    .filter((video) => {
      const key = video.videoEmbedUrl || video.videoUrl;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const isPlayableVideo = (video = {}) =>
  Boolean(
    video.videoEmbedUrl ||
      String(video.videoUrl || "").match(/[?&]v=([^?&/]+)/) ||
      String(video.videoUrl || "").match(/youtu\.be\/([^?&/]+)/)
  );

const buildCurriculumVideo = ({ item, language, year }) =>
  toRelatedVideo({
    videoTitle: item.topic.videoTitle || item.topic.topic,
    videoUrl: item.topic.videoUrl,
    videoEmbedUrl: item.topic.videoEmbedUrl,
    videoThumbnailUrl: item.topic.videoThumbnailUrl,
    videoChannel: item.topic.videoChannel || "YouTube",
    creatorName: item.topic.videoChannel || "YouTube",
    creator: item.topic.videoChannel || "YouTube",
    channelName: item.topic.videoChannel || "YouTube",
    course: item.subject,
    source: "fallback",
    videoDurationLabel: item.topic.videoDurationLabel,
    videoLanguage: language,
    videoSubject: item.subject,
    subjectName: item.subject,
    videoSubjectTag: item.subjectTag,
    videoSemester: year,
    videoVerified: false,
    recommendationScore: 60,
    recommendationConfidence: "low",
    recommendationReason:
      "Using the curated LearnNexus curriculum video because no imported verified playlist is available for this exact field yet.",
    fallbackUsed: true,
  });

const toCatalogVideoRecommendation = (video = {}, reason) =>
  toRelatedVideo({
    videoTitle: video.title,
    videoUrl: video.youtubeLink,
    videoEmbedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
    videoThumbnailUrl: video.thumbnail,
    videoChannel: video.creatorName,
    creatorName: video.creatorName,
    creatorId: video.creatorId,
    creator: video.creatorName,
    channelName: video.creatorName,
    course: video.course || video.subjectName || getSubjectLabel(video.subject),
    source: video.source === "manual-curated" ? "curated" : "verified",
    videoId: video.youtubeVideoId,
    videoChannelId: video.channelId,
    videoLanguage: video.language,
    videoSubject: video.subjectName || getSubjectLabel(video.subject),
    subjectName: video.subjectName || getSubjectLabel(video.subject),
    videoSubjectTag: video.subject,
    videoSemester: video.semester,
    videoVerified: video.verified === true,
    playlistTitle: video.playlistTitle,
    playlistId: video.playlistId,
    playlistPosition: video.playlistPosition,
    thumbnail: video.thumbnail,
    youtubeLink: video.youtubeLink,
    recommendationScore: 99,
    recommendationConfidence: "high",
    recommendationReason: reason,
    fallbackUsed: false,
  });

const getPreferredCreatorGuard = (user) => {
  const rawPreferredChannels = normalizeChannels(user.preferences?.preferredChannels);
  const creatorNames = new Set();
  const channelIds = new Set();

  rawPreferredChannels.forEach((channel) => {
    creatorNames.add(channel.toLowerCase());

    const resolvedChannel = resolveChannel(channel);

    if (resolvedChannel?.name) {
      creatorNames.add(resolvedChannel.name.toLowerCase());
    }

    if (resolvedChannel?.youtubeChannelId) {
      channelIds.add(resolvedChannel.youtubeChannelId);
    }
  });

  return {
    hasPreferredCreators: rawPreferredChannels.length > 0,
    creatorNames,
    channelIds,
  };
};

const findPlaylistContinuationForUser = async ({ user, language }) => {
  const latestState = await LearningState.findOne({
    user: user._id,
    playlistId: { $exists: true, $ne: "" },
    language,
  })
    .sort({ lastWatchedAt: -1 })
    .lean();

  if (!latestState?.playlistId) {
    return null;
  }

  const preferredCreatorGuard = getPreferredCreatorGuard(user);

  if (
    preferredCreatorGuard.hasPreferredCreators &&
    !preferredCreatorGuard.creatorNames.has(String(latestState.creatorName || "").toLowerCase()) &&
    !(latestState.channelId && preferredCreatorGuard.channelIds.has(latestState.channelId))
  ) {
    return null;
  }

  const playlistStates = await LearningState.find({
    user: user._id,
    playlistId: latestState.playlistId,
  })
    .sort({ playlistPosition: 1, lastWatchedAt: -1 })
    .lean();
  const completedVideoIds = new Set(
    playlistStates
      .filter((state) => state.completed)
      .map((state) => state.youtubeVideoId)
      .filter(Boolean)
  );
  const latestPosition = Number(latestState.playlistPosition);
  const hasLatestPosition = Number.isFinite(latestPosition);

  const baseQuery = {
    playlistId: latestState.playlistId,
    channelId: latestState.channelId,
    ...(latestState.creatorName ? { creatorName: latestState.creatorName } : {}),
    ...(latestState.subject ? { subject: resolveSubjectTag(latestState.subject) } : {}),
    language,
    verified: true,
    unavailable: { $ne: true },
  };
  let nextVideo = null;

  if (!latestState.completed) {
    nextVideo = await Video.findOne({
      ...baseQuery,
      youtubeVideoId: latestState.youtubeVideoId,
    }).lean();
  }

  const nextPositionQuery = hasLatestPosition
    ? { ...baseQuery, playlistPosition: { $gt: latestPosition } }
    : baseQuery;

  if (!nextVideo) {
    nextVideo = await Video.findOne({
      ...nextPositionQuery,
      youtubeVideoId: { $nin: Array.from(completedVideoIds) },
    })
      .sort({ playlistPosition: 1, updatedAt: -1 })
      .lean();
  }

  if (!nextVideo) {
    nextVideo = await Video.findOne({
      ...baseQuery,
      youtubeVideoId: { $nin: Array.from(completedVideoIds) },
    })
      .sort({ playlistPosition: 1, updatedAt: -1 })
      .lean();
  }

  if (!nextVideo) {
    return null;
  }

  const nextPosition = Number(nextVideo.playlistPosition);
  const followingVideos = await Video.find({
    ...baseQuery,
    youtubeVideoId: { $nin: [...Array.from(completedVideoIds), nextVideo.youtubeVideoId] },
    ...(Number.isFinite(nextPosition) ? { playlistPosition: { $gt: nextPosition } } : {}),
  })
    .sort({ playlistPosition: 1, updatedAt: -1 })
    .lean();
  const reason = `Continuing the same playlist: ${nextVideo.playlistTitle || latestState.playlistTitle}.`;

  return {
    subject: nextVideo.subjectName || getSubjectLabel(nextVideo.subject),
    topic: nextVideo.title,
    conceptSummary: `Continue the next lecture from ${nextVideo.playlistTitle || latestState.playlistTitle}. Stay in playlist order so the course builds cleanly.`,
    ...toCatalogVideoRecommendation(nextVideo, reason),
    relatedVideos: dedupeVideos(
      followingVideos.map((video) => toCatalogVideoRecommendation(video, reason))
    ),
  };
};

const buildPracticeTask = (topic, difficultyLevel) => {
  if (difficultyLevel >= 5) {
    return `${topic.practiceTask} Extend it with one trade-off analysis and document why your approach would hold up in production.`;
  }

  if (difficultyLevel >= 4) {
    return `${topic.practiceTask} Add one edge case review and explain how you would test the solution before shipping it.`;
  }

  if (difficultyLevel >= 3) {
    return `${topic.practiceTask} Finish with a short self-review that explains the key decision you made.`;
  }

  return `${topic.practiceTask} Finish with one worked example in your own words.`;
};

const buildQuizQuestions = (item, difficultyLevel) => [
  {
    question: `What is the main goal of ${item.topic.topic}?`,
    options: [
      item.topic.summary,
      "Skip the lecture and only mark the task complete.",
      "Memorize the video title without practicing.",
      "Replace the roadmap with unrelated content.",
    ],
    correctIndex: 0,
    explanation: "The summary describes the central concept this lesson is meant to teach.",
  },
  {
    question: "Which habit should you use during this lesson?",
    options: [
      "Watch passively until the timer ends.",
      "Pause, rebuild the example, and write a recap.",
      "Only open support links before watching.",
      "Change your field after every lesson.",
    ],
    correctIndex: 1,
    explanation:
      "LearnNexus counts watch time, but the lesson is strongest when you rebuild and recap.",
  },
  {
    question:
      difficultyLevel >= 4
        ? "What should advanced learners add after practice?"
        : "What should you do after finishing the practice task?",
    options:
      difficultyLevel >= 4
        ? [
            "Add an edge case or trade-off review.",
            "Delete the notes.",
            "Avoid testing the result.",
            "Ignore the confusing section.",
          ]
        : [
            "Write one worked example in your own words.",
            "Start a new topic immediately.",
            "Close the lesson without notes.",
            "Change the selected channel.",
          ],
    correctIndex: 0,
    explanation:
      difficultyLevel >= 4
        ? "Higher difficulty expects deeper review, trade-offs, and testing awareness."
        : "A short worked example locks in the concept before the next lesson.",
  },
];

const buildAssignedVideoQuizQuestions = ({
  videoTitle,
  creatorName,
  subject,
  playlistTitle,
  difficultyLevel,
}) => [
  {
    question: `What should you mainly learn from "${videoTitle}"?`,
    options: [
      `Understand and practice the concepts demonstrated in this ${subject} lecture.`,
      "Skip the lecture and only mark the task complete.",
      "Memorize only the thumbnail and video title.",
      "Replace the selected creator playlist with unrelated content.",
    ],
    correctIndex: 0,
    explanation:
      "The quiz should follow the actual assigned video, so the goal is to understand and practice what this lecture demonstrates.",
  },
  {
    question: `How should you study this ${creatorName || "creator"} video?`,
    options: [
      "Watch passively without trying anything.",
      "Pause, rebuild the shown example, and write a short recap.",
      "Only browse the recommendations without watching.",
      "Jump to a random video from another creator.",
    ],
    correctIndex: 1,
    explanation:
      "For video lessons, active practice is better than only watching the timer.",
  },
  {
    question:
      difficultyLevel >= 4
        ? "What should you add after finishing this video?"
        : "What should you do after this video ends?",
    options:
      difficultyLevel >= 4
        ? [
            "Write one edge case, trade-off, or improvement from the example.",
            "Delete your recap.",
            "Avoid testing anything shown in the lesson.",
            "Ignore the next video in the same playlist.",
          ]
        : [
            `Write one short recap from ${playlistTitle || "the selected playlist"}.`,
            "Start an unrelated course immediately.",
            "Close the lesson without noting anything.",
            "Change creator after every video.",
          ],
    correctIndex: 0,
    explanation:
      difficultyLevel >= 4
        ? "Advanced review should connect the watched video to testing, trade-offs, and improvement."
        : "A short recap helps you remember the actual video before moving to the next playlist lesson.",
  },
];

const normalizeComparableTitle = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const hasAssignedVideoOverride = (item, videoFields = {}) => {
  const assignedTitle = normalizeComparableTitle(videoFields.videoTitle);

  if (!assignedTitle) {
    return false;
  }

  const curriculumTitles = [
    item.topic.topic,
    item.topic.videoTitle,
  ].map(normalizeComparableTitle).filter(Boolean);

  return (
    (videoFields.source === "curated" ||
      videoFields.videoVerified === true ||
      Boolean(videoFields.playlistId)) &&
    !curriculumTitles.includes(assignedTitle)
  );
};

const buildAssignedLessonDetails = ({ item, videoFields = {}, difficultyLevel }) => {
  if (!hasAssignedVideoOverride(item, videoFields)) {
    return {
      subject: item.subject,
      topic: item.topic.topic,
      conceptSummary: `${item.topic.summary} ${item.goal}`,
      practiceTask: buildPracticeTask(item.topic, difficultyLevel),
      quizQuestions: buildQuizQuestions(item, difficultyLevel),
    };
  }

  const videoTitle = videoFields.videoTitle || item.topic.topic;
  const creatorName =
    videoFields.creatorName ||
    videoFields.videoChannel ||
    videoFields.creator ||
    videoFields.channelName ||
    "the selected creator";
  const subject =
    videoFields.videoSubject ||
    videoFields.subjectName ||
    getSubjectLabel(videoFields.videoSubjectTag) ||
    item.subject;
  const playlistTitle = videoFields.playlistTitle || "the selected playlist";

  return {
    subject,
    topic: videoTitle,
    conceptSummary: `Watch "${videoTitle}" from ${creatorName}. Focus on the concepts shown in this lecture and continue in ${playlistTitle} without mixing another creator's videos.`,
    practiceTask: `After watching "${videoTitle}", write a short recap with the main concepts, one example you understood, and what you should practice before the next video.`,
    quizQuestions: buildAssignedVideoQuizQuestions({
      videoTitle,
      creatorName,
      subject,
      playlistTitle,
      difficultyLevel,
    }),
  };
};

const buildSelectedSubjectFallbackTopic = (subjectTag) => {
  const subjectName = getSubjectLabel(subjectTag);

  return {
    subject: subjectName,
    subjectTag,
    topic: {
      topic: `${subjectName} Foundations`,
      summary: `Start with the core concepts, vocabulary, and first examples in ${subjectName}.`,
      practiceTask: `Watch the first relevant ${subjectName} lecture and write a short recap with one worked example.`,
      commonMistake:
        "Do not jump into random videos. Follow the selected creator and continue through the same playlist in order.",
      videoTitle: `${subjectName} Foundations`,
      videoUrl: "",
      videoEmbedUrl: "",
      videoChannel: "",
      videoDurationLabel: "60 min",
      notesText: `Focus on the foundations of ${subjectName}. Capture definitions, one diagram or example, and what to watch next in the same playlist.`,
      notesPdfUrl: "",
      lessonDurationMinutes: 60,
      lessonFrames: [],
      support: [],
    },
    topicSubjectTags: [subjectTag],
    goal: `Build a clean foundation in ${subjectName} using your selected learning preferences.`,
  };
};

const buildVideoFields = async ({ item, user, year }) => {
  const preferredChannels = normalizeChannels(user.preferences?.preferredChannels);
  const userPreferredSubjects = normalizeSubjects(user.preferences?.preferredSubjects);
  const preferredSubjectsAreUserSelected = userPreferredSubjects.length > 0;
  const preferredSubjects = userPreferredSubjects.length
    ? userPreferredSubjects
    : item.subjectTag
      ? [item.subjectTag]
      : normalizeSubjects(user.preferences?.preferredSubjects);
  const language = user.preferences?.videoLanguage || "English";
  const playlistContinuation = preferredChannels.length
    ? null
    : await findPlaylistContinuationForUser({
        user,
        language,
      });

  if (playlistContinuation) {
    return playlistContinuation;
  }

  const lectureVideo = await findLectureVideos({
    topic: item.topic.topic,
    subject: item.subject,
    course: user.course,
    year,
    preferredChannels,
    preferredSubjects,
    preferredSubjectsAreUserSelected,
    language,
  });

  const searchedVideos = lectureVideo
    ? [lectureVideo, ...(lectureVideo.alternativeVideos || [])]
    : [];
  const curriculumVideo = buildCurriculumVideo({ item, language, year });
  const shouldIncludeCurriculumFallbackVideo =
    preferredChannels.length === 0 || !lectureVideo || lectureVideo.videoVerified === false;
  const relatedVideos = dedupeVideos([
    ...searchedVideos,
    ...(shouldIncludeCurriculumFallbackVideo && isPlayableVideo(curriculumVideo)
      ? [curriculumVideo]
      : []),
  ]);

  if (!lectureVideo || lectureVideo.videoVerified === false) {
    if (isPlayableVideo(curriculumVideo)) {
      return {
        ...curriculumVideo,
        relatedVideos,
      };
    }

    return {
      relatedVideos,
      ...toRelatedVideo(lectureVideo),
    };
  }

  return {
    ...lectureVideo,
    relatedVideos,
  };
};

const getCurriculumSubjectTagSet = (subjects = []) => {
  const subjectTags = new Set();

  subjects.forEach((subject) => {
    subject.topics.forEach((topic) => {
      getTopicSubjectTags(subject, topic).forEach((tag) => subjectTags.add(tag));
    });
  });

  return subjectTags;
};

const pickTopicsForDay = (subjects, dayIndex, preferredSubjects = []) => {
  const courseSubjectTags = getCurriculumSubjectTagSet(subjects);
  // Preferred subjects can remain from a previous field selection. Keep them
  // only when they belong to the active field so Software Engineering cannot
  // accidentally generate a Machine Learning fallback task.
  const selectedSubjectTags = new Set(
    normalizeSubjects(preferredSubjects).filter(
      (tag) => courseSubjectTags.has(tag) || !CAREER_FIELD_SUBJECT_TAGS.has(tag)
    )
  );
  const candidates = subjects.flatMap((subject) =>
    subject.topics.map((topic) => {
      const topicSubjectTags = getTopicSubjectTags(subject, topic);
      const selectedTag = topicSubjectTags.find((tag) => selectedSubjectTags.has(tag));
      const subjectTag = selectedTag || topicSubjectTags[0] || resolveSubjectTag(subject.name, topic.topic);

      return {
        subject: getSubjectLabel(subjectTag),
        subjectTag,
        topic,
        topicSubjectTags,
        goal: subject.goal,
      };
    })
  );
  const availableTopics = selectedSubjectTags.size
    ? candidates.filter((item) =>
        item.topicSubjectTags.some((tag) => selectedSubjectTags.has(tag))
      )
    : candidates;
  const fallbackTopics =
    selectedSubjectTags.size && availableTopics.length === 0
      ? Array.from(selectedSubjectTags).map(buildSelectedSubjectFallbackTopic)
      : [];
  const orderedTopics = availableTopics.length ? availableTopics : fallbackTopics.length ? fallbackTopics : candidates;
  const topicIndex = (dayIndex - 1) % orderedTopics.length;

  return [orderedTopics[topicIndex]];
};

const planTasksMatchCurrentCourseSubjects = (plan, currentSubjectTags = new Set()) => {
  if (!Array.isArray(plan?.tasks) || plan.tasks.length === 0 || currentSubjectTags.size === 0) {
    return true;
  }

  return plan.tasks.every((task) => {
    const taskTags = new Set(
      [
        task.videoSubjectTag,
        resolveSubjectTag(task.subject, task.topic),
        resolveSubjectTag(task.videoSubject, task.videoTitle),
      ].filter(Boolean)
    );

    const conflictingCareerTag = Array.from(taskTags).find(
      (tag) => CAREER_FIELD_SUBJECT_TAGS.has(tag) && !currentSubjectTags.has(tag)
    );

    if (conflictingCareerTag) {
      return false;
    }

    return Array.from(taskTags).some(
      (tag) => currentSubjectTags.has(tag) || !CAREER_FIELD_SUBJECT_TAGS.has(tag)
    );
  });
};

const populateStudyPlan = (planId) =>
  StudyPlan.findById(planId).populate({
    path: "tasks",
    options: {
      sort: { order: 1 },
    },
  });

const toPublicStudyPlan = (plan) => {
  if (!plan) {
    return null;
  }

  const plainPlan = typeof plan.toObject === "function" ? plan.toObject() : plan;
  const tasks = (plainPlan.tasks || []).map((task) => {
    const plainTask = typeof task.toObject === "function" ? task.toObject() : task;

    return {
      ...plainTask,
      title: plainTask.topic || plainTask.videoTitle,
      type: "video",
      estimatedTime: plainTask.estimatedMinutes,
      status: plainTask.completed ? "completed" : "pending",
      dueDate: getLocalDateKey(plainTask.date || plainPlan.date),
    };
  });

  return {
    planId: String(plainPlan._id),
    userId: String(plainPlan.user),
    course: plainPlan.course,
    subject: tasks[0]?.subject || plainPlan.preferredSubjects?.[0] || plainPlan.subjects?.[0] || "",
    date: plainPlan.dateKey || getLocalDateKey(plainPlan.date),
    tasks,
  };
};

const createStudyPlan = async (user, requestedDate) => {
  const planDate = normalizeDate(requestedDate);
  const dateKey = getLocalDateKey(planDate);
  const curriculum = getCurriculumForUser(user.course, user.year);
  const dayIndex = daysBetween(planDate, user.createdAt) + 1;
  const preferredSubjects = normalizeSubjects(user.preferences?.preferredSubjects);
  const selectedTopics = pickTopicsForDay(curriculum.subjects, dayIndex, preferredSubjects);
  const preferredChannels = normalizeChannels(user.preferences?.preferredChannels);
  const adaptiveLevel = user.preferences?.adaptiveLevel || 3;

  const studyPlan = await StudyPlan.create({
    user: user._id,
    date: planDate,
    dateKey,
    course: user.course,
    year: user.year,
    dayIndex,
    trackName: curriculum.profileLabel,
    focusSummary: `${curriculum.theme} Today's mix leans on ${selectedTopics
      .map((item) => item.subject)
      .slice(0, 2)
      .join(" and ")}.`,
    subjects: curriculum.subjects.map((subject) => subject.name),
    preferredChannels,
    preferredSubjects,
    videoLanguage: user.preferences?.videoLanguage || "English",
    recommendationVersion: RECOMMENDATION_VERSION,
    totalTasks: selectedTopics.length,
    completedTasks: 0,
    completionRate: 0,
  });

  const taskPayloads = await Promise.all(
    selectedTopics.map(async (item, index) => {
      const difficultyLevel = clamp(
        user.year + Math.floor((dayIndex - 1) / 5) + index - 1 + adaptiveLevel - 3,
        1,
        5
      );
      const videoFields = await buildVideoFields({
        item,
        user,
        year: user.year,
      });
      const assignedLesson = buildAssignedLessonDetails({
        item,
        videoFields,
        difficultyLevel,
      });

      return {
        user: user._id,
        studyPlan: studyPlan._id,
        date: planDate,
        order: index + 1,
        subject: assignedLesson.subject,
        topic: assignedLesson.topic,
        conceptSummary: assignedLesson.conceptSummary,
        difficultyLevel,
        difficultyLabel: DIFFICULTY_LABELS[difficultyLevel],
        videoTitle: item.topic.videoTitle,
        videoUrl: item.topic.videoUrl,
        videoEmbedUrl: item.topic.videoEmbedUrl,
        videoChannel: item.topic.videoChannel,
        videoDurationLabel: item.topic.videoDurationLabel,
        ...videoFields,
        notesText: item.topic.notesText,
        notesPdfUrl: item.topic.notesPdfUrl,
        practiceTask: assignedLesson.practiceTask,
        estimatedMinutes: createEstimatedMinutes(),
        supportResources: item.topic.support,
        quizQuestions: assignedLesson.quizQuestions,
      };
    })
  );

  const tasks = await Task.insertMany(taskPayloads);

  studyPlan.tasks = tasks.map((task) => task._id);
  await studyPlan.save();

  const progress = await Progress.create({
    user: user._id,
    studyPlan: studyPlan._id,
    date: planDate,
    dateKey,
    totalTasks: tasks.length,
    completedTasks: 0,
    completionRate: 0,
    entries: tasks.map((task) => ({
      task: task._id,
      subject: task.subject,
      completed: false,
      watchSeconds: 0,
      progressRate: 0,
    })),
    subjectBreakdown: buildSubjectBreakdownFromEntries(
      tasks.map((task) => ({
        subject: task.subject,
        completed: false,
      }))
    ),
  });

  const hydratedPlan = await populateStudyPlan(studyPlan._id);
  return {
    plan: hydratedPlan,
    progress,
  };
};

const getStudyPlanBundle = async (user, requestedDate = new Date()) => {
  const planDate = normalizeDate(requestedDate);
  const dateKey = getLocalDateKey(planDate);
  const curriculum = getCurriculumForUser(user.course, user.year);

  let [plan, progress] = await Promise.all([
    StudyPlan.findOne({
      user: user._id,
      date: planDate,
    }).populate({
      path: "tasks",
      options: {
        sort: { order: 1 },
      },
    }),
    Progress.findOne({
      user: user._id,
      date: planDate,
    }),
  ]);

  const currentSubjects = curriculum.subjects.map((subject) => subject.name);
  const currentSubjectTags = getCurriculumSubjectTagSet(curriculum.subjects);
  const planSubjects = plan?.subjects || [];
  const preferredChannels = normalizeChannels(user.preferences?.preferredChannels);
  const preferredSubjects = normalizeSubjects(user.preferences?.preferredSubjects);
  const videoLanguage = user.preferences?.videoLanguage || "English";
  const planMatchesCurrentPreferences =
    plan?.course === user.course &&
    plan?.videoLanguage === videoLanguage &&
    getChannelSignature(plan?.preferredChannels) ===
      getChannelSignature(preferredChannels) &&
    getSubjectSignature(plan?.preferredSubjects) ===
      getSubjectSignature(preferredSubjects);
  const planMatchesExactCuratedVideo = planTasksMatchSelectedCuratedVideo({
    plan,
    course: user.course,
    language: videoLanguage,
    preferredChannels,
  });
  const planMatchesCurrentRoadmap =
    planMatchesCurrentPreferences &&
    plan?.trackName === curriculum.profileLabel &&
    plan?.recommendationVersion === RECOMMENDATION_VERSION &&
    planTasksMatchSelectedCreator(plan, preferredChannels) &&
    planMatchesExactCuratedVideo &&
    planTasksMatchCurrentCourseSubjects(plan, currentSubjectTags) &&
    planSubjects.length === currentSubjects.length &&
    currentSubjects.every((subject) => planSubjects.includes(subject));

  const hasSavedProgress =
    (Number(plan?.completedTasks) || 0) > 0 ||
    (Number(progress?.completedTasks) || 0) > 0;

  if (
    plan &&
    !planMatchesCurrentRoadmap &&
    (!hasSavedProgress || !planMatchesCurrentPreferences || !planMatchesExactCuratedVideo)
  ) {
    await Promise.all([
      Task.deleteMany({ studyPlan: plan._id }),
      Progress.deleteOne({ _id: progress?._id }),
      StudyPlan.deleteOne({ _id: plan._id }),
    ]);
    plan = null;
    progress = null;
  }

  if (!plan || !progress) {
    try {
      const createdBundle = await createStudyPlan(user, planDate);
      plan = createdBundle.plan;
      progress = createdBundle.progress;
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      [plan, progress] = await Promise.all([
        StudyPlan.findOne({
          user: user._id,
          date: planDate,
        }).populate({
          path: "tasks",
          options: {
            sort: { order: 1 },
          },
        }),
        Progress.findOne({
          user: user._id,
          date: planDate,
        }),
      ]);
    }
  }

  return {
    plan,
    progress,
    studyPlan: toPublicStudyPlan(plan),
  };
};

const getSubjectsBundle = (user) => ({
  course: user.course,
  year: user.year,
  preferredChannels: user.preferences?.preferredChannels || [],
  preferredSubjects: user.preferences?.preferredSubjects || [],
  recommendedChannels: getRecommendedChannels(
    user.preferences?.videoLanguage || "English"
  ),
  subjectCatalog: (user.preferences?.preferredSubjects || []).map((subject) => ({
    id: resolveSubjectTag(subject),
    name: getSubjectLabel(resolveSubjectTag(subject)),
  })),
  subjects: getSubjectsForUser(user.course, user.year),
});

const solveProblem = async (user, query) => {
  const results = await searchSupportResources({
    course: user.course,
    year: user.year,
    query,
    preferredChannels: user.preferences?.preferredChannels || [],
    preferredSubjects: user.preferences?.preferredSubjects || [],
    language: user.preferences?.videoLanguage || "English",
  });

  return {
    query,
    preferredChannels: user.preferences?.preferredChannels || [],
    recommendedChannels: getRecommendedChannels(
      user.preferences?.videoLanguage || "English"
    ),
    results,
    fallbackSearch: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${query} ${user.course} ${user.year} year`
    )}`,
  };
};

const syncAdaptiveLevel = async (user, quizScore) => {
  if (typeof quizScore !== "number") {
    return;
  }

  const currentLevel = user.preferences?.adaptiveLevel || 3;
  const nextLevel =
    quizScore >= 80
      ? clamp(currentLevel + 1, 1, 5)
      : quizScore < 50
        ? clamp(currentLevel - 1, 1, 5)
        : currentLevel;

  if (nextLevel !== currentLevel) {
    user.preferences.adaptiveLevel = nextLevel;
    await user.save();
  }
};

const setTaskProgress = async (user, taskId, updates = {}) => {
  const task = await Task.findOne({
    _id: taskId,
    user: user._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  const estimatedSeconds = Math.max(Number(task.estimatedMinutes) || 60, 60) * 60;
  const watchSeconds =
    typeof updates.watchSeconds === "number"
      ? Math.max(task.watchSeconds || 0, updates.watchSeconds)
      : task.watchSeconds || 0;
  const progressRate = Math.min(100, Math.round((watchSeconds / estimatedSeconds) * 100));
  const completed =
    typeof updates.completed === "boolean"
      ? updates.completed
      : task.completed || progressRate >= 100;

  task.watchSeconds = completed ? estimatedSeconds : watchSeconds;
  task.progressRate = completed ? 100 : progressRate;
  task.startedAt = task.startedAt || (watchSeconds > 0 ? new Date() : undefined);
  task.completed = completed;
  const completedAt = completed ? task.completedAt || new Date() : null;
  task.completedAt = completedAt;

  if (typeof updates.quizScore === "number") {
    if (!completed) {
      throw new ApiError(400, "Complete the lecture before taking the quiz.");
    }

    task.quizScore = updates.quizScore;
    task.quizCompletedAt = new Date();
    await syncAdaptiveLevel(user, updates.quizScore);
  }

  await task.save();

  const progress = await Progress.findOne({
    user: user._id,
    studyPlan: task.studyPlan,
  });

  if (!progress) {
    throw new ApiError(404, "Progress record not found for this task.");
  }

  progress.entries = progress.entries.map((entry) => {
    if (String(entry.task) !== String(task._id)) {
      return entry;
    }

      return {
      ...entry.toObject(),
      completed,
      watchSeconds: task.watchSeconds,
      progressRate: task.progressRate,
      quizScore: task.quizScore,
      completedAt: task.completedAt,
    };
  });
  progress.completedTasks = progress.entries.filter((entry) => entry.completed).length;
  progress.completionRate = calculateProgressRateFromEntries(progress.entries);
  progress.subjectBreakdown = buildSubjectBreakdownFromEntries(progress.entries);
  progress.lastUpdatedAt = new Date();
  await progress.save();

  const plan = await StudyPlan.findById(task.studyPlan);
  plan.completedTasks = progress.completedTasks;
  plan.completionRate = progress.completionRate;
  await plan.save();

  if (completed) {
    await recordStudyActivity({
      userId: user._id,
      studyPlanId: task.studyPlan,
      taskId: task._id,
      type: "task_completed",
      completedAt,
      dateKey: updates.dateKey || updates.activityDate || getLocalDateKey(completedAt),
    });
  } else {
    await syncUserStreak(user._id);
  }

  const [bundle, overview] = await Promise.all([
    getStudyPlanBundle(user, task.date),
    buildProgressOverview(user._id),
  ]);

  return {
    plan: bundle.plan,
    progress: bundle.progress,
    studyPlan: bundle.studyPlan,
    overview,
  };
};

const completeTask = (user, taskId, updates = {}) =>
  setTaskProgress(user, taskId, { ...updates, completed: true });

module.exports = {
  completeTask,
  getStudyPlanBundle,
  getSubjectsBundle,
  solveProblem,
  toPublicStudyPlan,
  setTaskProgress,
};
