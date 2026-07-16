const mongoose = require("mongoose");
const LearningState = require("../../../models/LearningState");
const Playlist = require("../../../models/Playlist");
const Video = require("../../../models/Video");
const {
  getSubjectLabel,
  resolveBranchTag,
  resolveChannel,
  resolveSubjectTag,
} = require("../../../data/recommendationCatalog");
const { CURATED_PLAYLISTS } = require("../../../data/curatedLearningCatalog");
const { importPlaylist } = require("../../videos/services/youtubePlaylistImportService");
const {
  fetchYouTubePlaylistVideos,
  orderPlaylistVideos,
} = require("../../videos/services/videoSearchService");
const { getCourseSubjectTags } = require("../../../services/curriculumService");
const ApiError = require("../../../utils/apiError");
const logger = require("../../../utils/logger");

const PLAYLIST_CONTINUATION_WINDOW_SIZE = 16;
const CODE_WITH_HARRY_CREATOR_ID = "codewithharry";
const CODE_WITH_HARRY_SIGMA_TOTAL_LECTURES = 129;

const SUBJECT_PATHS = {
  operating_systems: {
    complete: ["Process Synchronization", "Deadlocks", "Memory Management", "File Systems"],
    advanced: ["OS Advanced Topics", "Operating System Interview Questions"],
    nextSubjects: ["database_management_systems", "computer_networks"],
  },
  database_management_systems: {
    complete: ["SQL", "Normalization", "Transactions", "Indexing"],
    advanced: ["DBMS Interview Questions", "Query Optimization"],
    nextSubjects: ["computer_networks", "operating_systems"],
  },
  computer_networks: {
    complete: ["OSI Model", "TCP/IP", "Routing", "Congestion Control"],
    advanced: ["Network Security", "CN Interview Questions"],
    nextSubjects: ["operating_systems", "database_management_systems"],
  },
  data_structures: {
    complete: ["Arrays", "Linked Lists", "Trees", "Graphs"],
    advanced: ["Problem Solving", "DSA Interview Practice"],
    nextSubjects: ["object_oriented_programming", "database_management_systems"],
  },
  object_oriented_programming: {
    complete: ["Classes and Objects", "Inheritance", "Polymorphism", "Abstraction"],
    advanced: ["Design Principles", "OOPS Interview Questions"],
    nextSubjects: ["data_structures", "database_management_systems"],
  },
  web_development: {
    complete: ["HTML Foundations", "CSS Basics", "Flexbox", "Node.js"],
    advanced: ["Full Stack Deployment", "Authentication"],
    nextSubjects: ["javascript", "react"],
  },
  javascript: {
    complete: ["JavaScript Fundamentals", "DOM Events", "API Calls", "Projects"],
    advanced: ["Async JavaScript", "Testing"],
    nextSubjects: ["react", "web_development"],
  },
  react: {
    complete: ["React Basics", "State", "Routing", "API Calls"],
    advanced: ["React Router", "Full Stack Integration"],
    nextSubjects: ["javascript", "web_development"],
  },
  python: {
    complete: ["Python Syntax", "Functions", "Notebooks", "Data Handling"],
    advanced: ["Pandas", "Projects"],
    nextSubjects: ["data_science", "machine_learning"],
  },
  machine_learning: {
    complete: ["Machine Learning Basics", "Regression", "Classification", "Neural Networks"],
    advanced: ["Model Evaluation", "Deep Learning"],
    nextSubjects: ["python", "data_science"],
  },
  data_science: {
    complete: ["Python and Notebooks", "Pandas", "Visualization", "SQL"],
    advanced: ["Statistics", "Data Science Project"],
    nextSubjects: ["python", "machine_learning"],
  },
  cyber_security: {
    complete: ["Networking Basics", "Linux Command Line", "Web Security", "Threat Modeling"],
    advanced: ["Security Labs", "Secure Deployment"],
    nextSubjects: ["computer_networks", "web_development"],
  },
  programming: {
    complete: ["Syntax", "Functions", "Data Structures", "Practice"],
    advanced: ["Projects", "Problem Solving"],
    nextSubjects: ["web_development", "data_structures"],
  },
  software_engineering: {
    complete: ["Git and GitHub", "Authentication", "Testing", "Deployment"],
    advanced: ["System Design", "Production Readiness"],
    nextSubjects: ["web_development", "javascript"],
  },
};

const getVideoIdFromUrl = (value = "") => {
  const match = String(value).match(/[?&]v=([^?&]+)/) || String(value).match(/\/embed\/([^?&/]+)/);
  return match?.[1] || "";
};

const normalizeVideoInput = (video = {}) => {
  const youtubeVideoId =
    video.youtubeVideoId ||
    video.videoId ||
    getVideoIdFromUrl(video.youtubeLink || video.videoUrl || video.videoEmbedUrl);

  return {
    youtubeVideoId,
    playlistId: video.playlistId || "",
    playlistTitle: video.playlistTitle || "",
    playlistPosition:
      Number.isFinite(Number(video.playlistPosition)) ? Number(video.playlistPosition) : undefined,
    channelId: video.channelId || video.videoChannelId || "",
    creatorName: video.creatorName || video.videoChannel || "",
    creatorId: video.creatorId || "",
    subject: resolveSubjectTag(video.subject || video.videoSubjectTag || video.videoSubject || ""),
    subjectName: video.subjectName || video.videoSubject || "",
    language: video.language || video.videoLanguage || "",
    title: video.title || video.videoTitle || "Untitled lecture",
    thumbnail: video.thumbnail || video.videoThumbnailUrl || "",
    youtubeLink: video.youtubeLink || video.videoUrl || "",
  };
};

const toLearningVideo = (value = {}) => ({
  youtubeVideoId: value.youtubeVideoId,
  playlistId: value.playlistId || "",
  playlistTitle: value.playlistTitle || "",
  playlistPosition: value.playlistPosition,
  channelId: value.channelId || "",
  creatorName: value.creatorName || "",
  creatorId: value.creatorId || "",
  subject: value.subject || "",
  subjectName: value.subjectName || getSubjectLabel(value.subject),
  language: value.language || "",
  title: value.title || "Untitled lecture",
  thumbnail: value.thumbnail || "",
  youtubeLink: value.youtubeLink || "",
  currentSeconds: value.currentSeconds || 0,
  durationSeconds: value.durationSeconds || 0,
  percent: value.percent || 0,
  completed: value.completed === true,
  bookmarked: value.bookmarked === true,
  lastWatchedAt: value.lastWatchedAt,
});

const toPlaylistContinuationVideo = (video = {}) => ({
  videoTitle: video.title || "Next playlist lecture",
  videoUrl: video.youtubeLink || "",
  videoEmbedUrl: video.youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`
    : "",
  videoThumbnailUrl:
    video.thumbnail ||
    (video.youtubeVideoId ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg` : ""),
  videoChannel: video.creatorName || "YouTube",
  videoChannelId: video.channelId || "",
  creatorName: video.creatorName || "",
  creatorId: video.creatorId || "",
  creator: video.creatorName || "",
  channelName: video.creatorName || "",
  course: video.course || video.subjectName || getSubjectLabel(video.subject),
  source: video.source === "manual-curated" ? "curated" : "verified",
  videoId: video.youtubeVideoId || "",
  videoLanguage: video.language || "",
  videoSubject: video.subjectName || getSubjectLabel(video.subject),
  subjectName: video.subjectName || getSubjectLabel(video.subject),
  videoSubjectTag: video.subject || "",
  videoSemester: video.semester,
  videoVerified: video.verified === true,
  playlistTitle: video.playlistTitle || "",
  playlistId: video.playlistId || "",
  playlistPosition: video.playlistPosition,
  thumbnail: video.thumbnail || "",
  youtubeLink: video.youtubeLink || "",
  recommendationScore: 96,
  recommendationConfidence: "high",
  recommendationReason: `Continuing the same playlist: ${video.playlistTitle || video.playlistId}.`,
  fallbackUsed: false,
  videoDurationLabel: video.durationLabel || "",
  videoDurationSeconds: video.durationSeconds || 0,
  videoViews: 0,
});

const toFetchedPlaylistContinuationVideo = ({ video, state, subjectTag }) =>
  toPlaylistContinuationVideo({
    youtubeVideoId: video.videoId,
    playlistId: video.playlistId || state.playlistId,
    playlistTitle: video.playlistTitle || state.playlistTitle,
    playlistPosition: video.playlistPosition,
    channelId: video.channelId || state.channelId,
    creatorName: video.channelName || state.creatorName,
    creatorId: state.creatorId,
    subject: subjectTag || resolveSubjectTag(state.subject || "") || "web_development",
    subjectName: state.subjectName || getSubjectLabel(subjectTag),
    language: state.language || "Hindi",
    semester: state.semester || 1,
    title: video.title,
    verified: true,
    thumbnail: video.thumbnail,
    youtubeLink: video.url,
    durationLabel: video.timestamp || "Lesson video",
    durationSeconds: video.seconds || 0,
  });

const normalizeComparable = (value = "") => String(value || "").trim().toLowerCase();

const getPreferredCreatorGuard = (user = {}) => {
  const rawPreferredChannels = Array.isArray(user.preferences?.preferredChannels)
    ? user.preferences.preferredChannels
    : [];
  const creatorNames = new Set();
  const channelIds = new Set();

  rawPreferredChannels.forEach((channel) => {
    const rawName = normalizeComparable(channel);
    const resolvedChannel = resolveChannel(channel);

    if (rawName) {
      creatorNames.add(rawName);
    }

    if (resolvedChannel?.name) {
      creatorNames.add(normalizeComparable(resolvedChannel.name));
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

const isStateFromPreferredCreator = (user, state = {}) => {
  const { hasPreferredCreators, creatorNames, channelIds } = getPreferredCreatorGuard(user);

  if (!hasPreferredCreators) {
    return true;
  }

  return (
    creatorNames.has(normalizeComparable(state.creatorName)) ||
    (state.channelId && channelIds.has(state.channelId))
  );
};

const importPlaylistWindowIfNeeded = async ({ state, baseQuery, currentPosition, limit }) => {
  if (!state?.playlistId || !state.channelId || !Number.isFinite(currentPosition)) {
    return;
  }

  const neededImportedCount = currentPosition + limit + 1;
  const importedCount = await Video.countDocuments(baseQuery);

  if (importedCount >= neededImportedCount) {
    return;
  }

  const playlist = await Playlist.findOne({ youtubePlaylistId: state.playlistId }).lean();
  const knownTotal = Number(playlist?.videoCount) || getKnownPlaylistTotal(state.playlistId);

  if (knownTotal && currentPosition + 1 >= knownTotal) {
    return;
  }

  const subjectTag = resolveSubjectTag(state.subject || "") || "web_development";
  const pagesNeeded = Math.max(1, Math.ceil(neededImportedCount / 50));

  try {
    await importPlaylist({
      youtubePlaylistId: state.playlistId,
      channelId: state.channelId,
      creatorName: state.creatorName,
      creatorId: state.creatorId,
      subject: subjectTag,
      subjectName: state.subjectName || getSubjectLabel(subjectTag),
      playlistTitle: state.playlistTitle,
      semester: state.semester || 1,
      language: state.language || "Hindi",
      tags: [subjectTag, state.creatorId, "playlist-continuation"].filter(Boolean),
      verified: true,
      public: true,
      maxPages: pagesNeeded,
    });
  } catch (error) {
    logger.warn("Unable to import more playlist videos for continuation.", {
      playlistId: state.playlistId,
      creatorName: state.creatorName,
      currentPosition,
      neededImportedCount,
      error: error.message,
    });
  }
};

const fetchPlaylistWindowFromYouTube = async ({ state, currentPosition, limit }) => {
  if (!state?.playlistId || !state.channelId || !Number.isFinite(currentPosition)) {
    return [];
  }

  const channel = resolveChannel(state.channelId) || resolveChannel(state.creatorName) || {
    id: state.creatorId,
    name: state.creatorName || "YouTube",
    youtubeChannelId: state.channelId,
  };
  const curatedPlaylist = CURATED_PLAYLISTS.find(
    (playlist) => playlist.youtubePlaylistId === state.playlistId
  );
  const playlist = {
    youtubePlaylistId: state.playlistId,
    playlistTitle: state.playlistTitle || curatedPlaylist?.playlistTitle || "",
    startVideoId: curatedPlaylist?.startVideoId || "",
  };

  try {
    const fetchedVideos = orderPlaylistVideos(
      await fetchYouTubePlaylistVideos({ playlist, channel }),
      playlist
    );
    const subjectTag = resolveSubjectTag(state.subject || "") || curatedPlaylist?.subject || "web_development";

    return fetchedVideos
      .filter((video) => Number(video.playlistPosition) > currentPosition)
      .slice(0, limit)
      .map((video) =>
        toFetchedPlaylistContinuationVideo({
          video,
          state,
          subjectTag,
        })
      );
  } catch (error) {
    logger.warn("Unable to fetch public playlist continuation window.", {
      playlistId: state.playlistId,
      creatorName: state.creatorName,
      currentPosition,
      error: error.message,
    });
    return [];
  }
};

const getNextPlaylistVideosForState = async (
  user,
  state,
  { limit = PLAYLIST_CONTINUATION_WINDOW_SIZE } = {}
) => {
  if (!state?.playlistId) {
    return {
      nextPlaylistVideos: [],
      playlistCompleted: false,
    };
  }

  if (!isStateFromPreferredCreator(user, state)) {
    return {
      nextPlaylistVideos: [],
      playlistCompleted: false,
    };
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || PLAYLIST_CONTINUATION_WINDOW_SIZE));
  const channelFilter = state.channelId ? { channelId: state.channelId } : {};
  const creatorFilter = state.creatorName ? { creatorName: state.creatorName } : {};
  const languageFilter = state.language ? { language: state.language } : {};
  const baseQuery = {
    playlistId: state.playlistId,
    ...channelFilter,
    ...creatorFilter,
    ...languageFilter,
    verified: true,
    unavailable: { $ne: true },
  };
  let currentPosition = Number(state.playlistPosition);

  if (!Number.isFinite(currentPosition)) {
    const currentVideo = await Video.findOne({
      ...baseQuery,
      youtubeVideoId: state.youtubeVideoId,
    }).lean();

    currentPosition = Number(currentVideo?.playlistPosition);
  }

  if (!Number.isFinite(currentPosition)) {
    return {
      nextPlaylistVideos: [],
      playlistCompleted: false,
    };
  }

  await importPlaylistWindowIfNeeded({
    state,
    baseQuery,
    currentPosition,
    limit: safeLimit,
  });

  // This is a sliding continuation window, not a hidden playlist cap. Keep it
  // locked to the same playlist, creator, channel, and language so a stale
  // imported row can never replace the learner's selected creator/course. Do
  // not lock by subject: one creator playlist can contain HTML, CSS, JS, and
  // React while still being the same ordered course.
  const nextVideos = await Video.find({
    ...baseQuery,
    playlistPosition: { $gt: currentPosition },
  })
    .sort({ playlistPosition: 1, updatedAt: -1 })
    .limit(safeLimit)
    .lean();

  if (nextVideos.length > 0) {
    return {
      nextPlaylistVideos: nextVideos.map(toPlaylistContinuationVideo),
      playlistCompleted: false,
    };
  }

  const fetchedWindow = await fetchPlaylistWindowFromYouTube({
    state,
    currentPosition,
    limit: safeLimit,
  });

  if (fetchedWindow.length > 0) {
    return {
      nextPlaylistVideos: fetchedWindow,
      playlistCompleted: false,
    };
  }

  const remainingCount = await Video.countDocuments({
    ...baseQuery,
    playlistPosition: { $gt: currentPosition },
  });
  const playlist = await Playlist.findOne({ youtubePlaylistId: state.playlistId }).lean();
  const knownTotal = Number(playlist?.videoCount) || getKnownPlaylistTotal(state.playlistId);

  return {
    nextPlaylistVideos: [],
    playlistCompleted: remainingCount === 0 && (!knownTotal || currentPosition + 1 >= knownTotal),
  };
};

const updateVideoLearningState = async (user, payload = {}) => {
  const video = normalizeVideoInput(payload.video || payload);

  if (!video.youtubeVideoId) {
    throw new ApiError(400, "youtubeVideoId is required to save video progress.");
  }

  const durationSeconds = Math.max(0, Number(payload.durationSeconds) || 0);
  const currentSeconds = Math.max(0, Number(payload.currentSeconds) || 0);
  const computedPercent = durationSeconds
    ? Math.min(100, Math.round((currentSeconds / durationSeconds) * 100))
    : Number(payload.percent) || 0;
  const completed = payload.completed === true || computedPercent >= 95;

  const state = await LearningState.findOneAndUpdate(
    {
      user: user._id,
      youtubeVideoId: video.youtubeVideoId,
    },
    {
      ...video,
      task: mongoose.isValidObjectId(payload.taskId) ? payload.taskId : undefined,
      currentSeconds: completed ? durationSeconds || currentSeconds : currentSeconds,
      durationSeconds,
      percent: completed ? 100 : Math.max(0, Math.min(100, computedPercent)),
      completed,
      completedAt: completed ? new Date() : undefined,
      bookmarked: typeof payload.bookmarked === "boolean" ? payload.bookmarked : undefined,
      lastWatchedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

  return toLearningVideo(state);
};

const getUserStates = async (userId) =>
  LearningState.find({ user: userId }).sort({ lastWatchedAt: -1 }).lean();

const buildProgressLookup = (states = []) =>
  states.reduce((lookup, state) => {
    lookup[state.youtubeVideoId] = toLearningVideo(state);
    return lookup;
  }, {});

const getPlaylistProgress = async ({ userId, playlistId }) => {
  if (!playlistId) {
    return null;
  }

  const [totalLectures, completedLectures] = await Promise.all([
    Video.countDocuments({ playlistId, unavailable: { $ne: true }, verified: true }),
    LearningState.countDocuments({ user: userId, playlistId, completed: true }),
  ]);

  return {
    playlistId,
    totalLectures,
    completedLectures,
    percent: totalLectures ? Math.round((completedLectures / totalLectures) * 100) : 0,
  };
};

const buildContinueLearning = (states = []) =>
  states
    .filter((state) => !state.completed && state.percent > 0)
    .slice(0, 8)
    .map(toLearningVideo);

const buildRecentlyWatched = (states = []) => states.slice(0, 8).map(toLearningVideo);

const getKnownPlaylistTotal = (playlistId = "") => {
  const isCodeWithHarrySigmaPlaylist = CURATED_PLAYLISTS.some(
    (playlist) =>
      playlist.creatorId === CODE_WITH_HARRY_CREATOR_ID &&
      playlist.primaryCreatorPlaylist &&
      playlist.subject === "web_development" &&
      playlist.youtubePlaylistId === playlistId
  );

  return isCodeWithHarrySigmaPlaylist ? CODE_WITH_HARRY_SIGMA_TOTAL_LECTURES : 0;
};

const toRecommendedPlaylist = (playlist, progress = null) => ({
  playlistId: playlist.youtubePlaylistId || playlist.playlistId,
  title: playlist.playlistTitle || playlist.title,
  creatorId: playlist.creatorId || "",
  creatorName: playlist.creatorName,
  channelId: playlist.channelId,
  subject: playlist.subject,
  subjectName: playlist.subjectName || getSubjectLabel(playlist.subject),
  language: playlist.language,
  thumbnail:
    playlist.thumbnail ||
    (playlist.startVideoId
      ? `https://img.youtube.com/vi/${playlist.startVideoId}/hqdefault.jpg`
      : ""),
  totalLectures: playlist.importedVideoCount || playlist.videoCount || 0,
  percent: progress?.percent || 0,
  reason: `${playlist.subjectName || getSubjectLabel(playlist.subject)} playlist from ${playlist.creatorName}, matched to your ${playlist.language} learning path.`,
});

const findCuratedRecommendedPlaylists = ({ completedPlaylistIds, language, preferredChannels, subjectFallback }) =>
  CURATED_PLAYLISTS.filter((playlist) => playlist.language === language)
    .filter((playlist) => !completedPlaylistIds.has(playlist.youtubePlaylistId))
    .filter((playlist) => subjectFallback.includes(playlist.subject))
    .filter((playlist) =>
      preferredChannels.size > 0 ? preferredChannels.has(playlist.creatorName) : true
    )
    .sort(
      (left, right) =>
        (Number(left.pathOrder) || 0) - (Number(right.pathOrder) || 0) ||
        left.creatorName.localeCompare(right.creatorName) ||
        left.playlistTitle.localeCompare(right.playlistTitle)
    );

const isCodeWithHarrySelected = (preferredChannelValues = [], resolvedPreferredChannels = []) =>
  resolvedPreferredChannels.some((channel) => channel.id === CODE_WITH_HARRY_CREATOR_ID) ||
  preferredChannelValues.some((channel) => resolveChannel(channel)?.id === CODE_WITH_HARRY_CREATOR_ID);

const getCodeWithHarryCreatorPlaylist = ({ language, course = "", subjectFallback = [] }) =>
  CURATED_PLAYLISTS.find(
    (playlist) =>
      playlist.creatorId === CODE_WITH_HARRY_CREATOR_ID &&
      playlist.primaryCreatorPlaylist &&
      playlist.language === language &&
      (resolveBranchTag(course) === "software" ||
        subjectFallback.includes(playlist.subject))
  );

const getRecommendedPlaylists = async (user, states = []) => {
  const completedPlaylistIds = new Set(
    states.filter((state) => state.completed && state.playlistId).map((state) => state.playlistId)
  );
  const activeSubjects = Array.from(
    new Set(
      [
        ...(user.preferences?.preferredSubjects || []).map((subject) => resolveSubjectTag(subject)),
        ...states.map((state) => state.subject),
      ].filter(Boolean)
    )
  );
  const preferredChannelValues = user.preferences?.preferredChannels || [];
  const resolvedPreferredChannels = preferredChannelValues
    .map((channel) => resolveChannel(channel))
    .filter(Boolean);
  const preferredChannels = new Set(
    resolvedPreferredChannels.length
      ? resolvedPreferredChannels.map((channel) => channel.name)
      : preferredChannelValues
  );
  const preferredChannelIds = new Set(resolvedPreferredChannels.map((channel) => channel.youtubeChannelId));
  const courseSubjects = getCourseSubjectTags(user.course, user.year);
  const courseSubjectSet = new Set(courseSubjects);
  const activeCourseSubjects = activeSubjects.filter((subject) =>
    courseSubjectSet.has(subject)
  );
  const subjectFallback = activeCourseSubjects.length
    ? activeCourseSubjects
    : courseSubjects;
  const language = user.preferences?.videoLanguage || "English";
  const codeWithHarryPlaylist = isCodeWithHarrySelected(
    preferredChannelValues,
    resolvedPreferredChannels
  )
    ? getCodeWithHarryCreatorPlaylist({ language, course: user.course, subjectFallback })
    : null;
  const curatedPlaylists = codeWithHarryPlaylist
    ? [codeWithHarryPlaylist]
    : findCuratedRecommendedPlaylists({
        completedPlaylistIds,
        language,
        preferredChannels,
        subjectFallback,
      });
  const playlistQuery = codeWithHarryPlaylist
    ? {
        language,
        verified: true,
        youtubePlaylistId: codeWithHarryPlaylist.youtubePlaylistId,
        creatorId: CODE_WITH_HARRY_CREATOR_ID,
      }
    : {
        subject: { $in: subjectFallback },
        language,
        verified: true,
        youtubePlaylistId: { $nin: Array.from(completedPlaylistIds) },
      };

  if (!codeWithHarryPlaylist && preferredChannels.size > 0) {
    playlistQuery.$or = [
      { creatorName: { $in: Array.from(preferredChannels) } },
      { channelId: { $in: Array.from(preferredChannelIds) } },
    ];
  }

  const importedPlaylists = await Playlist.find(playlistQuery)
    .sort({ importedVideoCount: -1, videoCount: -1, updatedAt: -1 })
    .limit(12)
    .lean()
  const importedById = new Map(
    importedPlaylists.map((playlist) => [playlist.youtubePlaylistId, playlist])
  );
  const recommended = [
    ...curatedPlaylists.map((playlist) => {
      const imported = importedById.get(playlist.youtubePlaylistId);

      return toRecommendedPlaylist(
        imported
          ? {
              ...imported,
              ...playlist,
              importedVideoCount: imported.importedVideoCount,
              videoCount: imported.videoCount,
              importStatus: imported.importStatus,
            }
          : playlist
      );
    }),
    ...importedPlaylists
      .filter((playlist) => !curatedPlaylists.some((curated) => curated.youtubePlaylistId === playlist.youtubePlaylistId))
      .map((playlist) => toRecommendedPlaylist(playlist)),
  ];

  return recommended.slice(0, 12);
};

const buildRoadmap = (user, states = []) => {
  const preferredSubject = user.preferences?.preferredSubjects?.[0];
  const preferredSubjectTag = preferredSubject ? resolveSubjectTag(preferredSubject) : "";
  const latestSubject =
    preferredSubjectTag ||
    states.find((state) => state.subject)?.subject ||
    getCourseSubjectTags(user.course, user.year)[0] ||
    "web_development";
  const path = SUBJECT_PATHS[latestSubject] || {
    complete: [
      `${getSubjectLabel(latestSubject)} foundations`,
      `${getSubjectLabel(latestSubject)} core concepts`,
      `${getSubjectLabel(latestSubject)} guided practice`,
      `${getSubjectLabel(latestSubject)} review`,
    ],
    advanced: [`Advanced ${getSubjectLabel(latestSubject)}`],
    nextSubjects: getCourseSubjectTags(user.course, user.year)
      .filter((subject) => subject !== latestSubject)
      .slice(0, 2),
  };

  return {
    currentSubject: {
      id: latestSubject,
      name: getSubjectLabel(latestSubject),
    },
    completeThisSubject: path.complete.map((title, index) => ({
      id: `${latestSubject}-${index}`,
      title,
      completed: states.some(
        (state) =>
          state.completed &&
          state.subject === latestSubject &&
          state.title?.toLowerCase().includes(title.toLowerCase().split(" ")[0])
      ),
    })),
    recommendedNextPlaylist: path.advanced[0],
    advancedTopics: path.advanced,
    nextRecommendedSubjects: path.nextSubjects.map((subject) => ({
      id: subject,
      name: getSubjectLabel(subject),
    })),
  };
};

const getLearningFlow = async (user) => {
  const states = await getUserStates(user._id);
  const recommendedPlaylists = await getRecommendedPlaylists(user, states);

  return {
    continueLearning: buildContinueLearning(states),
    recentlyWatched: buildRecentlyWatched(states),
    recommendedForYou: recommendedPlaylists.slice(0, 6),
    recommendedPlaylists,
    roadmap: buildRoadmap(user, states),
    progressByVideoId: buildProgressLookup(states),
  };
};

module.exports = {
  getLearningFlow,
  getNextPlaylistVideosForState,
  getPlaylistProgress,
  updateVideoLearningState,
};
