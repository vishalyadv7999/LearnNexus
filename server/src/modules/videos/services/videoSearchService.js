const {
  CHANNELS,
  VERIFIED_PLAYLISTS,
  VERIFIED_VIDEOS,
  channelSupportsLanguage,
  getChannelsByLanguage,
  getSubjectLabel,
  normalizeKey,
  resolveBranchTag,
  resolveChannel,
  resolveSubjectTag,
  semesterFromYear,
} = require("../../../data/recommendationCatalog");
const env = require("../../../config/env");
const { getCache, setCache } = require("../../../services/cacheService");
const logger = require("../../../utils/logger");
const mongoose = require("mongoose");
const Video = require("../../../models/Video");
const { findCuratedMapping } = require("../../../data/curatedLearningCatalog");

const SEARCH_TIMEOUT_MS = 7000;
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const MIN_ACCURACY_SCORE = 80;
const RECOMMENDATION_CACHE_VERSION = "v32-course-scoped-direct-creator-playlists";
const CODE_WITH_HARRY_CREATOR_ID = "codewithharry";
const CAREER_FIELD_SUBJECT_TAGS = new Set([
  "machine_learning",
  "data_science",
  "artificial_intelligence",
  "cyber_security",
]);
const COURSE_BRANCH_TO_PRIMARY_SUBJECT = {
  machine_learning: "machine_learning",
  data_science: "data_science",
  artificial_intelligence: "artificial_intelligence",
  cyber_security: "cyber_security",
};
const DIRECT_CREATOR_PLAYLIST_IDS = new Set([
  CODE_WITH_HARRY_CREATOR_ID,
  "apna-college",
  "chai-aur-code",
  "sheryians",
  "web-dev-mastery",
]);
const DIRECT_CREATOR_IDS = new Set([...DIRECT_CREATOR_PLAYLIST_IDS, "college-wallah"]);
const CREATOR_ROADMAP_VIDEO_IDS = {
  "college-wallah": "college-wallah-web-roadmap",
  "codewithharry:machine_learning": "codewithharry-ml-roadmap",
};
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_PLAYLIST_ITEMS_PER_PAGE = 50;

const CHANNELS_BY_LANGUAGE = {
  English: getChannelsByLanguage("English").map((channel) => channel.name),
  Hindi: getChannelsByLanguage("Hindi").map((channel) => channel.name),
};

const RECOMMENDED_CHANNELS = [
  ...CHANNELS_BY_LANGUAGE.English,
  ...CHANNELS_BY_LANGUAGE.Hindi,
];

const readText = (value) =>
  value?.simpleText || value?.runs?.map((run) => run.text).join("") || "";

const getBrowseId = (value) => {
  const endpoint =
    value?.runs?.[0]?.navigationEndpoint ||
    value?.navigationEndpoint ||
    value?.commandMetadata?.webCommandMetadata;

  return endpoint?.browseEndpoint?.browseId || "";
};

const parseDurationSeconds = (duration = "") => {
  const parts = duration
    .split(":")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 0) {
    return 0;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
};

const extractJsonObjectAfter = (html, marker) => {
  const markerIndex = html.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  const startIndex = html.indexOf("{", markerIndex);

  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return html.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const collectVideoRenderers = (value, results = []) => {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (value.videoRenderer) {
    results.push(value.videoRenderer);
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectVideoRenderers(item, results));
    return results;
  }

  Object.values(value).forEach((item) => collectVideoRenderers(item, results));
  return results;
};

const collectPlaylistVideoRenderers = (value, results = []) => {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPlaylistVideoRenderers(item, results));
    return results;
  }

  if (value.playlistVideoRenderer) {
    results.push(value.playlistVideoRenderer);
    return results;
  }

  Object.values(value).forEach((item) => collectPlaylistVideoRenderers(item, results));
  return results;
};

const getThumbnail = (videoRenderer) => {
  const thumbnails = videoRenderer.thumbnail?.thumbnails || [];
  return thumbnails[thumbnails.length - 1]?.url || "";
};

const getViews = (video) => {
  if (typeof video.views === "number") {
    return video.views;
  }

  const parsedViews = Number(String(video.views || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsedViews) ? parsedViews : 0;
};

const getVideoIdFromLink = (value = "") => {
  const match = value.match(/[?&]v=([^?&]+)/);
  return match?.[1] || "";
};

const getVideoIdFromAnyUrl = (value = "") => {
  const text = String(value || "");
  const watchId = getVideoIdFromLink(text);
  const embedMatch = text.match(/\/embed\/([^?&/]+)/);
  const shortMatch = text.match(/youtu\.be\/([^?&/]+)/);

  return watchId || embedMatch?.[1] || shortMatch?.[1] || "";
};

const getSelectedCuratedStandaloneVideo = ({ course, language, preferredChannels = [] }) =>
  preferredChannels
    .map((creator) => findCuratedMapping({ creator, course, language }))
    .find((mapping) => mapping?.youtubeVideoId && !(mapping.playlistId || mapping.youtubePlaylistId)) ||
  null;

const getCuratedStandaloneVideoForChannel = ({ channel, course, language }) => {
  if (!channel) {
    return null;
  }

  return findCuratedMapping({
    creator: channel.id || channel.name,
    course,
    language,
  });
};

const hasCourseCuratedStandaloneVideo = ({ channel, course, language }) => {
  const mapping = getCuratedStandaloneVideoForChannel({ channel, course, language });

  return Boolean(mapping?.youtubeVideoId && !(mapping.playlistId || mapping.youtubePlaylistId));
};

const recommendationMatchesSelectedCuratedVideo = ({ recommendation, course, language, preferredChannels }) => {
  const selectedVideo = getSelectedCuratedStandaloneVideo({
    course,
    language,
    preferredChannels,
  });

  if (!selectedVideo) {
    return true;
  }

  const recommendationVideoId =
    recommendation?.videoId ||
    getVideoIdFromAnyUrl(recommendation?.videoUrl) ||
    getVideoIdFromAnyUrl(recommendation?.youtubeLink) ||
    getVideoIdFromAnyUrl(recommendation?.videoEmbedUrl);

  if (recommendationVideoId !== selectedVideo.youtubeVideoId) {
    return false;
  }

  const recommendationUrl = recommendation?.videoUrl || recommendation?.youtubeLink || "";

  return !recommendationUrl || recommendationUrl === selectedVideo.youtubeLink;
};

const getStartSecondsFromLink = (value = "") => {
  const text = String(value || "");
  const match = text.match(/[?&](?:t|start)=([^?&]+)/);

  if (!match) {
    return 0;
  }

  const token = match[1];
  const hourMatch = token.match(/(\d+)h/);
  const minuteMatch = token.match(/(\d+)m/);
  const secondMatch = token.match(/(\d+)s?/);

  if (hourMatch || minuteMatch || secondMatch) {
    return (
      (Number(hourMatch?.[1]) || 0) * 3600 +
      (Number(minuteMatch?.[1]) || 0) * 60 +
      (Number(secondMatch?.[1]) || 0)
    );
  }

  return Number(token) || 0;
};

const buildNoCookieEmbedUrl = (videoId = "", youtubeLink = "") => {
  if (!videoId) {
    return "";
  }

  const startSeconds = getStartSecondsFromLink(youtubeLink);
  const params = startSeconds > 0 ? `?start=${startSeconds}` : "";

  return `https://www.youtube-nocookie.com/embed/${videoId}${params}`;
};

const buildSearchQuery = ({ topic, subject, course, semester, language, channel }) =>
  `${topic} ${subject} ${course} semester ${semester} ${language} ${channel.name}`;

const channelSupportsSubject = ({ channel, subjectTag, language }) =>
  channel.subjects.includes(subjectTag) ||
  VERIFIED_PLAYLISTS.some(
    (playlist) =>
      playlist.channelId === channel.youtubeChannelId &&
      playlist.subject === subjectTag &&
      playlist.language === language
  );

const channelSupportsSemester = ({ channel, subjectTag, language, semester }) =>
  channel.semesters.includes(semester) ||
  VERIFIED_PLAYLISTS.some(
    (playlist) =>
      playlist.channelId === channel.youtubeChannelId &&
      playlist.subject === subjectTag &&
      playlist.language === language
  );

const searchYouTubeVideos = async (query) => {
  const cacheKey = `youtube-search:${normalizeKey(query)}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query
    )}&sp=EgIQAQ%253D%253D`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LearnNexus/1.0; +https://learnnexus.app)",
        accept: "text/html",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const rawJson =
      extractJsonObjectAfter(html, "var ytInitialData =") ||
      extractJsonObjectAfter(html, "ytInitialData =");

    if (!rawJson) {
      return [];
    }

    const initialData = JSON.parse(rawJson);
    const videos = collectVideoRenderers(initialData)
      .filter((video) => video.videoId && readText(video.title))
      .map((video) => {
        const channelName = readText(video.ownerText) || readText(video.shortBylineText);

        return {
          title: readText(video.title),
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          videoId: video.videoId,
          thumbnail: getThumbnail(video),
          timestamp: readText(video.lengthText),
          seconds: parseDurationSeconds(readText(video.lengthText)),
          views: readText(video.viewCountText),
          channelName,
          channelId:
            getBrowseId(video.ownerText) ||
            getBrowseId(video.shortBylineText) ||
            video.ownerBadges?.[0]?.metadataBadgeRenderer?.tooltip ||
            "",
        };
      });

    await setCache(cacheKey, videos, CACHE_TTL_SECONDS);
    return videos;
  } finally {
    clearTimeout(timeoutId);
  }
};

const PLAYLIST_TOPIC_STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "from",
  "course",
  "full",
  "stack",
  "development",
  "foundations",
  "foundation",
  "basics",
  "intro",
  "introduction",
  "lecture",
  "video",
  "software",
  "engineering",
]);

const getTopicTokens = (...values) =>
  values
    .map((value) => normalizeKey(value))
    .join("_")
    .split("_")
    .filter((token) => token.length > 2 && !PLAYLIST_TOPIC_STOP_WORDS.has(token));

const scorePlaylistForTopic = ({ playlist, topic, subject }) => {
  const topicKey = normalizeKey(`${topic} ${subject}`);
  const courseKey = normalizeKey(playlist.course);
  const titleKey = normalizeKey(`${playlist.playlistTitle || ""} ${playlist.title || ""}`);
  const playlistTokens = new Set(getTopicTokens(playlist.course, playlist.playlistTitle, ...(playlist.tags || [])));
  const requestedTokens = getTopicTokens(topic, subject);
  const tokenMatches = requestedTokens.filter((token) => playlistTokens.has(token)).length;
  let score = 100 - (Number(playlist.pathOrder) || 0) / 1000;

  if (courseKey && topicKey.includes(courseKey)) {
    score += 60;
  }

  if (requestedTokens.some((token) => titleKey.includes(token))) {
    score += 25;
  }

  score += tokenMatches * 12;
  return score;
};

const findVerifiedPlaylists = ({ channel, subjectTag, language, topic = "", subject = "" }) =>
  VERIFIED_PLAYLISTS.filter(
    (playlist) =>
      playlist.channelId === channel.youtubeChannelId &&
      playlist.subject === subjectTag &&
      playlist.language === language
  ).sort(
    (left, right) =>
      scorePlaylistForTopic({ playlist: right, topic, subject }) -
        scorePlaylistForTopic({ playlist: left, topic, subject }) ||
      (Number(left.pathOrder) || 0) - (Number(right.pathOrder) || 0) ||
      left.playlistTitle.localeCompare(right.playlistTitle)
  );

const isPrimaryCreatorPlaylist = (playlist = {}) =>
  playlist.source === "manual-curated" &&
  playlist.startVideoId &&
  playlist.primaryCreatorPlaylist !== false;

const sortPlaylistsForSelection = ({ playlists, topic, subject }) =>
  [...playlists].sort(
    (left, right) =>
      scorePlaylistForTopic({ playlist: right, topic, subject }) -
        scorePlaylistForTopic({ playlist: left, topic, subject }) ||
      (Number(left.pathOrder) || 0) - (Number(right.pathOrder) || 0) ||
      left.playlistTitle.localeCompare(right.playlistTitle)
  );

const sortCreatorRoadmapPlaylists = (playlists = []) =>
  [...playlists].sort((left, right) => {
    const leftRoadmapOrder = Number(left.creatorRoadmapOrder);
    const rightRoadmapOrder = Number(right.creatorRoadmapOrder);

    if (Number.isFinite(leftRoadmapOrder) || Number.isFinite(rightRoadmapOrder)) {
      return (
        (Number.isFinite(leftRoadmapOrder) ? leftRoadmapOrder : 9999) -
        (Number.isFinite(rightRoadmapOrder) ? rightRoadmapOrder : 9999)
      );
    }

    return (Number(left.pathOrder) || 0) - (Number(right.pathOrder) || 0);
  });

const getCourseCareerSubjectTag = (course = "") =>
  COURSE_BRANCH_TO_PRIMARY_SUBJECT[resolveBranchTag(course)] || "";

const isSubjectTagAllowedForCourse = (subjectTag = "", course = "") => {
  if (!CAREER_FIELD_SUBJECT_TAGS.has(subjectTag)) {
    return true;
  }

  return subjectTag === getCourseCareerSubjectTag(course);
};

const filterPreferredSubjectTagsForCourse = (subjectTags = [], course = "") => {
  const filteredTags = subjectTags.filter((tag) => isSubjectTagAllowedForCourse(tag, course));

  if (subjectTags.length > 0 && filteredTags.length === 0) {
    logger.info("Ignored stale preferred subject tags outside selected course", {
      course,
      selectedBranch: resolveBranchTag(course),
      ignoredSubjectTags: subjectTags,
    });
  }

  return filteredTags;
};

const playlistMatchesSelectedCourse = (playlist = {}, course = "") => {
  const courseBranch = resolveBranchTag(course);

  if (courseBranch === "software") {
    return !CAREER_FIELD_SUBJECT_TAGS.has(playlist.subject);
  }

  const courseSubjectTag = getCourseCareerSubjectTag(course);

  if (!courseSubjectTag) {
    return true;
  }

  return playlist.subject === courseSubjectTag;
};

const findPrimaryCreatorPlaylists = ({
  channel,
  subjectTag,
  language,
  topic = "",
  subject = "",
  course = "",
}) => {
  if (DIRECT_CREATOR_PLAYLIST_IDS.has(channel.id)) {
    // These creators are selected directly in the UI, so their user-provided
    // creator playlist is the source of truth even when the current roadmap
    // subject says React/JS/etc. For Chai aur Code, keep the configured
    // roadmap order so HTML starts first and JavaScript can appear after it.
    const creatorPlaylists = VERIFIED_PLAYLISTS.filter(
      (playlist) =>
        playlist.channelId === channel.youtubeChannelId &&
        playlist.language === language &&
        playlistMatchesSelectedCourse(playlist, course) &&
        (isPrimaryCreatorPlaylist(playlist) ||
          (channel.id === "chai-aur-code" &&
            playlist.creatorRoadmapId === "chai-aur-code-web-roadmap") ||
          (channel.id === CODE_WITH_HARRY_CREATOR_ID &&
            playlist.creatorRoadmapId === "codewithharry-ml-roadmap"))
    );

    if (channel.id === CODE_WITH_HARRY_CREATOR_ID && subjectTag === "machine_learning") {
      return sortCreatorRoadmapPlaylists(
        creatorPlaylists.filter(
          (playlist) => playlist.creatorRoadmapId === "codewithharry-ml-roadmap"
        )
      );
    }

    if (channel.id === "chai-aur-code") {
      return sortCreatorRoadmapPlaylists(creatorPlaylists);
    }

    return sortPlaylistsForSelection({
      playlists: creatorPlaylists.filter(isPrimaryCreatorPlaylist),
      topic,
      subject,
    });
  }

  const exactSubjectPlaylists = findVerifiedPlaylists({
    channel,
    subjectTag,
    language,
    topic,
    subject,
  }).filter(isPrimaryCreatorPlaylist);

  if (exactSubjectPlaylists.length > 0 || subjectTag !== "web_development") {
    return exactSubjectPlaylists;
  }

  // Some creator-level Web Development mappings are stored under their exact
  // starter topic (for example Chai aur Code's HTML playlist). When the learner
  // selects the creator from the broader Web Development flow, still use that
  // protected primary mapping instead of falling through to stale DB/mock data.
  return sortPlaylistsForSelection({
    playlists: VERIFIED_PLAYLISTS.filter(
      (playlist) =>
        playlist.channelId === channel.youtubeChannelId &&
        playlist.language === language &&
        isPrimaryCreatorPlaylist(playlist)
    ),
    topic,
    subject,
  });
};

const findVerifiedVideos = ({ channel, subjectTag, language }) =>
  VERIFIED_VIDEOS.filter(
    (video) =>
      video.channelId === channel.youtubeChannelId &&
      video.subject === subjectTag &&
      video.language === language
  );

const hasVerifiedCatalogContent = ({ channel, subjectTag, language }) =>
  channel.verified ||
  findVerifiedPlaylists({ channel, subjectTag, language }).length > 0 ||
  findVerifiedVideos({ channel, subjectTag, language }).length > 0;

const getCuratedPlaylistById = (playlistId = "") =>
  VERIFIED_PLAYLISTS.find(
    (playlist) =>
      playlist.source === "manual-curated" && playlist.youtubePlaylistId === playlistId
  );

const matchesCuratedPlaylistIdentity = (video = {}, playlist = {}) =>
  Boolean(
    playlist?.youtubePlaylistId &&
      video.playlistId === playlist.youtubePlaylistId &&
      video.channelId === playlist.channelId &&
      normalizeKey(video.creatorName || "") === normalizeKey(playlist.creatorName || "") &&
      (!playlist.creatorId || !video.creatorId || video.creatorId === playlist.creatorId) &&
      video.language === playlist.language &&
      video.subject === playlist.subject
  );

const getSelectedCuratedPlaylist = ({ channel, subjectTag, language, topic, subject, course }) =>
  findPrimaryCreatorPlaylists({ channel, subjectTag, language, topic, subject, course })[0];

const getSelectedCuratedPlaylistIds = ({
  candidateChannels,
  subjectTag,
  language,
  topic,
  subject,
  course,
}) =>
  candidateChannels
    .map(({ channel }) =>
      getSelectedCuratedPlaylist({ channel, subjectTag, language, topic, subject, course })
    )
    .filter(Boolean)
    .map((playlist) => playlist.youtubePlaylistId);

const logCuratedSelection = ({ selectedCreator, selectedCourse, selectedPlaylistId, returned, rejected = [] }) => {
  logger.info("Curated video selection resolved", {
    selectedCreator,
    selectedCourse,
    selectedPlaylistId,
    returned,
    rejectedCount: rejected.length,
  });

  if (rejected.length > 0) {
    logger.warn("Rejected videos outside selected curated creator or playlist", {
      selectedCreator,
      selectedCourse,
      selectedPlaylistId,
      rejected: rejected.slice(0, 10).map((video) => ({
        videoId: getVideoIdFromLink(video.videoUrl || video.youtubeLink || "") || video.youtubeVideoId || "",
        creator: video.creatorName || video.videoChannel || "",
        creatorId: video.creatorId || "",
        playlistId: video.playlistId || "",
      })),
    });
  }
};

const logRecommendationDebug = ({ selectedChannel, result, sourceOfData }) => {
  logger.info("Recommendation playlist debug", {
    selectedCreatorId: selectedChannel?.id || result?.creatorId || "",
    selectedCreatorName:
      selectedChannel?.name || result?.creatorName || result?.videoChannel || "",
    playlistId: result?.playlistId || "",
    videoId: result?.videoId || "",
    startIndex: Number.isFinite(Number(result?.playlistPosition))
      ? Number(result.playlistPosition)
      : 0,
    firstLoadedVideo: result?.videoId || result?.videoUrl || "",
    firstVideoUrl: result?.videoUrl || "",
    firstVideoTitle: result?.videoTitle || "",
    sourceOfData,
  });
};

const parsePlaylistPosition = (value, fallbackIndex) => {
  const parsed = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : fallbackIndex;
};

const fetchYouTubePlaylistVideos = async ({ playlist, channel }) => {
  const cacheKey = `youtube-playlist:${RECOMMENDATION_CACHE_VERSION}:${playlist.youtubePlaylistId}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const apiVideos = await fetchYouTubePlaylistVideosFromApi({ playlist, channel });

    if (apiVideos.length > 0) {
      await setCache(cacheKey, apiVideos, CACHE_TTL_SECONDS);
      return apiVideos;
    }
  } catch (error) {
    logger.warn("YouTube playlistItems recommendation fetch failed; falling back to public feed", {
      channel: channel.name,
      playlistId: playlist.youtubePlaylistId,
      error: error.message,
    });
  }

  try {
    const feedVideos = await fetchYouTubePlaylistVideosFromFeed({ playlist, channel });

    if (feedVideos.length > 0) {
      await setCache(cacheKey, feedVideos, CACHE_TTL_SECONDS);
      return feedVideos;
    }
  } catch (error) {
    logger.warn("YouTube playlist feed recommendation fetch failed; falling back to playlist page", {
      channel: channel.name,
      playlistId: playlist.youtubePlaylistId,
      error: error.message,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(
      playlist.youtubePlaylistId
    )}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LearnNexus/1.0; +https://learnnexus.app)",
        accept: "text/html",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const rawJson =
      extractJsonObjectAfter(html, "var ytInitialData =") ||
      extractJsonObjectAfter(html, "ytInitialData =");

    if (!rawJson) {
      return [];
    }

    const initialData = JSON.parse(rawJson);
    const videos = collectPlaylistVideoRenderers(initialData)
      .filter((video) => video.videoId && readText(video.title))
      .map((video, index) => ({
        title: readText(video.title),
        url: `https://www.youtube.com/watch?v=${video.videoId}&list=${playlist.youtubePlaylistId}`,
        videoId: video.videoId,
        thumbnail: getThumbnail(video),
        timestamp: readText(video.lengthText),
        seconds: parseDurationSeconds(readText(video.lengthText)),
        views: 0,
        channelName: channel.name,
        channelId: channel.youtubeChannelId,
        playlistId: playlist.youtubePlaylistId,
        playlistTitle: playlist.playlistTitle,
        playlistPosition: parsePlaylistPosition(readText(video.index), index),
      }));

    await setCache(cacheKey, videos, CACHE_TTL_SECONDS);
    return videos;
  } finally {
    clearTimeout(timeoutId);
  }
};

const orderPlaylistVideos = (videos = [], playlist = {}) => {
  if (!playlist.startVideoId) {
    return videos;
  }

  const startIndex = videos.findIndex((video) => video.videoId === playlist.startVideoId);

  if (startIndex < 0) {
    return videos;
  }

  return [...videos.slice(startIndex), ...videos.slice(0, startIndex)];
};

const getSnippetThumbnail = (snippet = {}) => {
  const thumbnails = snippet.thumbnails || {};

  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
};

const decodeXmlText = (value = "") =>
  String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const readXmlTag = (entry = "", tagName) => {
  const match = entry.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return decodeXmlText(match?.[1]?.trim() || "");
};

const readXmlAttribute = (entry = "", tagName, attributeName) => {
  const match = entry.match(new RegExp(`<${tagName}[^>]*\\s${attributeName}="([^"]*)"`, "i"));

  return decodeXmlText(match?.[1] || "");
};

const fetchYouTubePlaylistVideosFromFeed = async ({ playlist, channel }) => {
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(
    playlist.youtubePlaylistId
  )}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; LearnNexus/1.0; +https://learnnexus.app)",
      accept: "application/xml,text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube playlist feed request failed: ${response.status}`);
  }

  const xml = await response.text();
  const entries = Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map((match) => match[0]);

  return entries
    .map((entry, index) => {
      const videoId = readXmlTag(entry, "yt:videoId");
      const title = readXmlTag(entry, "title");

      if (!videoId || !title) {
        return null;
      }

      return {
        title,
        url: `https://www.youtube.com/watch?v=${videoId}&list=${playlist.youtubePlaylistId}`,
        videoId,
        thumbnail:
          readXmlAttribute(entry, "media:thumbnail", "url") ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        timestamp: "",
        seconds: 0,
        views: 0,
        channelName: channel.name,
        channelId: channel.youtubeChannelId,
        playlistId: playlist.youtubePlaylistId,
        playlistTitle: playlist.playlistTitle,
        playlistPosition: index,
      };
    })
    .filter(Boolean);
};

const fetchYouTubePlaylistVideosFromApi = async ({ playlist, channel }) => {
  if (!env.youtubeApiKey) {
    return [];
  }

  const videos = [];
  let pageToken = "";

  do {
    const url = new URL(`${YOUTUBE_API_BASE_URL}/playlistItems`);
    url.searchParams.set("key", env.youtubeApiKey);
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", playlist.youtubePlaylistId);
    url.searchParams.set("maxResults", String(MAX_PLAYLIST_ITEMS_PER_PAGE));

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube playlistItems request failed: ${response.status}`);
    }

    const payload = await response.json();

    (payload.items || []).forEach((item) => {
      const snippet = item.snippet || {};
      const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId || "";
      const ownerChannelId = snippet.videoOwnerChannelId || snippet.channelId || "";

      if (
        !videoId ||
        snippet.title === "Deleted video" ||
        snippet.title === "Private video" ||
        item.status?.privacyStatus === "private" ||
        (ownerChannelId && ownerChannelId !== channel.youtubeChannelId)
      ) {
        return;
      }

      videos.push({
        title: snippet.title,
        url: `https://www.youtube.com/watch?v=${videoId}&list=${playlist.youtubePlaylistId}`,
        videoId,
        thumbnail: getSnippetThumbnail(snippet) || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        timestamp: "",
        seconds: 0,
        views: 0,
        channelName: channel.name,
        channelId: channel.youtubeChannelId,
        playlistId: playlist.youtubePlaylistId,
        playlistTitle: playlist.playlistTitle,
        playlistPosition: Number.isFinite(Number(snippet.position))
          ? Number(snippet.position)
          : videos.length,
      });
    });

    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return videos;
};

const titleMatchesSubject = ({ title, subjectTag, topic }) => {
  const normalizedTitle = normalizeKey(`${title} ${topic}`);
  const subjectTokens = subjectTag.split("_").filter((token) => token.length > 2);

  return subjectTokens.some((token) => normalizedTitle.includes(token));
};

const titleMatchesTopic = ({ title, topic }) => {
  const normalizedTitle = normalizeKey(title);
  const topicTokens = normalizeKey(topic)
    .split("_")
    .filter((token) => token.length > 3)
    .filter((token) => !["intro", "introduction", "basics", "lecture", "video"].includes(token));

  return topicTokens.length > 0 && topicTokens.some((token) => normalizedTitle.includes(token));
};

const resolvePreferredSubjectTags = (preferredSubjects = []) =>
  preferredSubjects
    .map((subject) => resolveSubjectTag(subject))
    .filter(Boolean);

const scoreVideo = ({ video, channel, subjectTag, semester, selectedChannelId, topic, language }) => {
  if (video.channelId !== channel.youtubeChannelId) {
    return 0;
  }

  if (!channel.verified || !channelSupportsSubject({ channel, subjectTag, language })) {
    return 0;
  }

  if (!channelSupportsSemester({ channel, subjectTag, language, semester })) {
    return 0;
  }

  let score = 60;
  score += !selectedChannelId || video.channelId === selectedChannelId ? 25 : 10;
  score += titleMatchesSubject({ title: video.title, subjectTag, topic }) ? 10 : 0;
  score += titleMatchesTopic({ title: video.title, topic }) ? 8 : 0;
  score += video.seconds >= 120 || video.seconds === 0 ? 3 : 0;
  score += getViews(video) > 0 ? 2 : 0;

  return Math.min(100, score);
};

const toLectureVideo = ({
  video,
  channel,
  playlist,
  subject,
  subjectTag,
  semester,
  language,
  score,
  fallbackUsed,
}) => {
  const curatedPlaylist = playlist || getCuratedPlaylistById(video.playlistId);

  return {
    videoTitle: video.title,
    videoUrl: video.url,
    videoEmbedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
    videoThumbnailUrl: video.thumbnail,
    videoDurationLabel: video.timestamp || "",
    videoDurationSeconds: video.seconds || 0,
    videoViews: getViews(video),
    videoChannel: channel.name,
    videoChannelId: channel.youtubeChannelId,
    creatorName: channel.name,
    creatorId: curatedPlaylist?.creatorId || channel.id,
    creator: channel.name,
    channelName: channel.name,
    course: curatedPlaylist?.course || getSubjectLabel(subjectTag),
    source: curatedPlaylist ? "curated" : "verified",
    videoId: video.videoId,
    subjectName: getSubjectLabel(subjectTag),
    playlistTitle: video.playlistTitle || `${channel.name} ${getSubjectLabel(subjectTag)}`,
    playlistId: video.playlistId,
    playlistUrl: video.playlistId
      ? `https://www.youtube.com/playlist?list=${video.playlistId}`
      : "",
    playlistPosition: video.playlistPosition,
    thumbnail: video.thumbnail,
    youtubeLink: video.url,
    videoLanguage: language,
    videoSubject: subject,
    videoSubjectTag: subjectTag,
    videoSemester: video.semester || semester,
    videoVerified: true,
    recommendationScore: score,
    recommendationConfidence: score >= 92 ? "high" : "medium",
    recommendationReason: fallbackUsed
      ? `Verified fallback for ${subject} because it matches ${language}, semester ${semester}, and the same subject.`
      : video.playlistId
        ? `Exact playlist match from ${channel.name}: ${video.playlistTitle || video.playlistId}.`
        : `Exact creator and subject match for ${subject} from ${channel.name}, ${language}, semester ${semester}.`,
    fallbackUsed,
  };
};

const toLectureVideoFromCuratedPlaylist = ({
  playlist,
  channel,
  subject,
  subjectTag,
  semester,
  language,
  score,
}) => ({
  videoTitle: playlist.playlistTitle || playlist.title,
  videoUrl: `https://www.youtube.com/watch?v=${playlist.startVideoId}&list=${playlist.youtubePlaylistId}`,
  videoEmbedUrl: `https://www.youtube-nocookie.com/embed/${playlist.startVideoId}`,
  videoThumbnailUrl: `https://img.youtube.com/vi/${playlist.startVideoId}/hqdefault.jpg`,
  videoDurationLabel: "",
  videoDurationSeconds: 0,
  videoViews: 0,
  videoChannel: playlist.creatorName || channel.name,
  videoChannelId: playlist.channelId,
  creatorName: playlist.creatorName || channel.name,
  creatorId: playlist.creatorId || channel.id,
  creator: playlist.creatorName || channel.name,
  channelName: playlist.creatorName || channel.name,
  course: playlist.course,
  source: "curated",
  videoId: playlist.startVideoId,
  subjectName: playlist.subjectName || getSubjectLabel(subjectTag),
  playlistTitle: playlist.playlistTitle || playlist.title,
  playlistId: playlist.youtubePlaylistId,
  playlistUrl: `https://www.youtube.com/playlist?list=${playlist.youtubePlaylistId}`,
  playlistPosition: 0,
  creatorRoadmapId: playlist.creatorRoadmapId || "",
  creatorRoadmapOrder: playlist.creatorRoadmapOrder,
  thumbnail: `https://img.youtube.com/vi/${playlist.startVideoId}/hqdefault.jpg`,
  youtubeLink: `https://www.youtube.com/watch?v=${playlist.startVideoId}&list=${playlist.youtubePlaylistId}`,
  videoLanguage: language,
  videoSubject: subject,
  videoSubjectTag: subjectTag,
  videoSemester: playlist.semester || semester,
  videoVerified: true,
  recommendationScore: score,
  recommendationConfidence: "high",
  recommendationReason: `Manual curated playlist starter from ${playlist.creatorName || channel.name}. Do not auto-replace these manually curated playlists.`,
  fallbackUsed: false,
});

const toLectureVideoFromCatalog = ({ video, channel, subject, subjectTag, semester, score, playlist }) => {
  const curatedPlaylist = playlist || getCuratedPlaylistById(video.playlistId);

  return {
    videoTitle: video.title,
    videoUrl: video.youtubeLink,
    videoEmbedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
    videoThumbnailUrl: video.thumbnail,
    videoDurationLabel: "",
    videoDurationSeconds: 0,
    videoViews: 0,
    videoChannel: video.creatorName || channel.name,
    videoChannelId: video.channelId,
    creatorName: video.creatorName || channel.name,
    creatorId: video.creatorId || curatedPlaylist?.creatorId || channel.id,
    creator: video.creatorName || channel.name,
    channelName: video.creatorName || channel.name,
    course: curatedPlaylist?.course || getSubjectLabel(subjectTag),
    source: curatedPlaylist ? "curated" : "verified",
    videoId: video.youtubeVideoId,
    subjectName: video.subjectName || getSubjectLabel(subjectTag),
    playlistTitle: video.playlistTitle || `${channel.name} ${getSubjectLabel(subjectTag)}`,
    playlistId: video.playlistId,
    playlistUrl: video.playlistId
      ? `https://www.youtube.com/playlist?list=${video.playlistId}`
      : "",
    playlistPosition: video.playlistPosition,
    thumbnail: video.thumbnail,
    youtubeLink: video.youtubeLink,
    videoLanguage: video.language,
    videoSubject: subject,
    videoSubjectTag: subjectTag,
    videoSemester: video.semester || semester,
    videoVerified: video.verified === true,
    recommendationScore: score,
    recommendationConfidence: score >= 95 ? "high" : "medium",
    recommendationReason: `Verified playlist match from ${video.creatorName || channel.name}. The video belongs to playlist ${video.playlistTitle || video.playlistId} and channel ${video.channelId}.`,
    fallbackUsed: false,
  };
};

const toLectureVideoFromVerifiedVideo = ({ video, channel, subject, subjectTag, score }) => ({
  videoTitle: video.title,
  videoUrl: video.youtubeLink,
  videoEmbedUrl: buildNoCookieEmbedUrl(video.youtubeVideoId, video.youtubeLink),
  videoThumbnailUrl: video.thumbnail || `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`,
  videoDurationLabel: video.durationLabel || "",
  videoDurationSeconds: video.durationSeconds || 0,
  videoViews: 0,
  videoChannel: video.creatorName || channel.name,
  videoChannelId: video.channelId,
  creatorName: video.creatorName || channel.name,
  creatorId: video.creatorId || channel.id,
  creator: video.creatorName || channel.name,
  channelName: video.creatorName || channel.name,
  course: video.course || getSubjectLabel(subjectTag),
  source: video.source === "manual-curated" ? "curated" : "verified",
  videoId: video.youtubeVideoId,
  subjectName: video.subjectName || getSubjectLabel(subjectTag),
  playlistTitle: video.playlistTitle || "",
  playlistId: "",
  creatorRoadmapId: video.creatorRoadmapId || "",
  creatorRoadmapOrder: video.creatorRoadmapOrder,
  thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`,
  youtubeLink: video.youtubeLink,
  videoLanguage: video.language,
  videoSubject: subject,
  videoSubjectTag: subjectTag,
  videoSemester: video.semester,
  videoVerified: true,
  recommendationScore: Number.isFinite(Number(video.creatorRoadmapOrder))
    ? score - Number(video.creatorRoadmapOrder) / 1000
    : score,
  recommendationConfidence: "high",
  recommendationReason: `Verified video match from ${video.creatorName || channel.name}.`,
  fallbackUsed: false,
});

const buildCandidateChannels = ({ preferredChannels, language, subjectTag, semester, branch, course }) => {
  const hasCreatorFilter = preferredChannels.length > 0;
  const sourceChannels = hasCreatorFilter
    ? preferredChannels.map(resolveChannel).filter(Boolean)
    : CHANNELS.filter((channel) => channel.verified);
  const shouldKeepDirectCreator = (channel) =>
    DIRECT_CREATOR_IDS.has(channel.id) ||
    hasCourseCuratedStandaloneVideo({ channel, course, language });

  const selectedChannels = preferredChannels
    .map(resolveChannel)
    .filter(Boolean)
    .filter((channel) => hasVerifiedCatalogContent({ channel, subjectTag, language }))
    .filter((channel) => channelSupportsLanguage(channel, language))
    // Direct creator selections use the user's exact mapped playlist/video as
    // the source of truth. Do not drop Apna College/College Wallah just because
    // today's roadmap topic is tagged React/JS/etc.; that caused old curriculum
    // fallback videos such as Traversy Media to appear for the selected creator.
    .filter(
      (channel) =>
        shouldKeepDirectCreator(channel) ||
        channelSupportsSubject({ channel, subjectTag, language })
    )
    .filter(
      (channel) =>
        shouldKeepDirectCreator(channel) ||
        channelSupportsSemester({ channel, subjectTag, language, semester })
    )
    .filter((channel) => shouldKeepDirectCreator(channel) || channel.branches.includes(branch));
  const broadSubjectChannels = sourceChannels
    .filter((channel) => channelSupportsLanguage(channel, language))
    .filter((channel) => channelSupportsSubject({ channel, subjectTag, language }))
    .filter((channel) => channelSupportsSemester({ channel, subjectTag, language, semester }))
    .filter((channel) => channel.branches.includes(branch));

  return (hasCreatorFilter ? selectedChannels : broadSubjectChannels).map((channel) => ({
    channel,
    fallbackUsed: false,
  }));
};

const scoreCatalogVideo = ({ video, subjectTag, topic, selectedChannelId }) => {
  if (video.unavailable || !video.verified) {
    return 0;
  }

  let score = 74;
  score += titleMatchesSubject({ title: video.title, subjectTag, topic }) ? 10 : 0;
  score += titleMatchesTopic({ title: video.title, topic }) ? 8 : 0;
  score += selectedChannelId && video.channelId === selectedChannelId ? 4 : 0;
  score += typeof video.playlistPosition === "number" && video.playlistPosition < 10 ? 2 : 0;

  return Math.min(100, score);
};

const findCatalogLectureVideos = async ({
  candidateChannels,
  language,
  subject,
  subjectTag,
  semester,
  topic,
  preferredChannels,
  selectedCuratedPlaylistIds = [],
}) => {
  if (mongoose.connection.readyState !== 1 || candidateChannels.length === 0) {
    return [];
  }

  const channelIds = candidateChannels.map(({ channel }) => channel.youtubeChannelId);
  const selectedCreatorNames = candidateChannels.map(({ channel }) => channel.name).filter(Boolean);
  const selectedChannelId =
    preferredChannels.length > 0 ? candidateChannels[0]?.channel.youtubeChannelId : "";
  const baseQuery = {
    channelId: { $in: channelIds },
    ...(preferredChannels.length > 0 && selectedCreatorNames.length > 0
      ? { creatorName: { $in: selectedCreatorNames } }
      : {}),
    subject: subjectTag,
    language,
    verified: true,
    unavailable: { $ne: true },
  };
  const selectedCuratedPlaylists = selectedCuratedPlaylistIds
    .map(getCuratedPlaylistById)
    .filter(Boolean);
  const selectedCuratedGuards = selectedCuratedPlaylists.map((playlist) => ({
    playlistId: playlist.youtubePlaylistId,
    channelId: playlist.channelId,
    creatorName: playlist.creatorName,
    subject: playlist.subject,
    language: playlist.language,
  }));
  const query =
    selectedCuratedGuards.length > 0
      ? {
          ...baseQuery,
          $or: selectedCuratedGuards,
        }
      : baseQuery;
  let videos = await Video.find({
    ...query,
    semester,
  })
    .sort({ playlistId: 1, playlistPosition: 1, updatedAt: -1 })
    .lean();

  if (videos.length === 0) {
    videos = await Video.find(query)
      .sort({ playlistId: 1, playlistPosition: 1, updatedAt: -1 })
      .lean();
  }

  if (selectedCuratedPlaylistIds.length > 0) {
    const rejectedCatalogVideos = await Video.find({
      ...baseQuery,
      playlistId: { $nin: selectedCuratedPlaylistIds },
    })
      .limit(20)
      .lean();
    const selectedPlaylist = getCuratedPlaylistById(selectedCuratedPlaylistIds[0]);

    if (rejectedCatalogVideos.length > 0) {
      logger.warn("Ignored catalog videos outside selected curated playlist", {
        selectedCreator: selectedPlaylist?.creatorName || "",
        selectedCourse: selectedPlaylist?.course || "",
        selectedPlaylistId: selectedPlaylist?.youtubePlaylistId || selectedCuratedPlaylistIds[0],
        rejectedCount: rejectedCatalogVideos.length,
        rejected: rejectedCatalogVideos.slice(0, 10).map((video) => ({
          videoId: video.youtubeVideoId,
          creator: video.creatorName,
          playlistId: video.playlistId,
        })),
      });
    }
  }

  const channelLookup = new Map(
    candidateChannels.map(({ channel }) => [channel.youtubeChannelId, channel])
  );

  return videos
    .map((video) => {
      const channel = channelLookup.get(video.channelId);
      const playlist = getCuratedPlaylistById(video.playlistId);

      if (playlist && !matchesCuratedPlaylistIdentity(video, playlist)) {
        logger.warn("Rejected catalog video with mismatched curated playlist identity", {
          expectedCreator: playlist.creatorName,
          expectedPlaylistId: playlist.youtubePlaylistId,
          videoId: video.youtubeVideoId,
          actualCreator: video.creatorName,
          actualPlaylistId: video.playlistId,
          actualChannelId: video.channelId,
        });
        return null;
      }

      const score = channel
        ? scoreCatalogVideo({ video, subjectTag, topic, selectedChannelId })
        : 0;

      return channel && score >= MIN_ACCURACY_SCORE
        ? toLectureVideoFromCatalog({
            video,
            channel,
            subject,
            subjectTag,
            semester,
            score,
            playlist,
          })
        : null;
    })
    .filter(Boolean);
};

const getCuratedStarterScore = ({ playlist, topic, subject }) => {
  if (playlist.creatorId === "apna-college") {
    return 100;
  }

  if (
    playlist.creatorRoadmapId === "chai-aur-code-web-roadmap" ||
    playlist.creatorRoadmapId === "codewithharry-ml-roadmap"
  ) {
    return 100 - (Number(playlist.creatorRoadmapOrder) || 0) / 1000;
  }

  return Math.min(100, 90 + scorePlaylistForTopic({ playlist, topic, subject }) / 20);
};

const buildCuratedStandaloneVideoRecommendations = ({
  candidateChannels,
  language,
  subject,
  subjectTag,
  course,
  preferredSubjects = [],
  preferredSubjectsAreUserSelected = true,
}) =>
  candidateChannels.flatMap(({ channel }) =>
    {
      const courseStandaloneVideo = getCuratedStandaloneVideoForChannel({
        channel,
        course,
        language,
      });

      if (
        courseStandaloneVideo?.youtubeVideoId &&
        !(courseStandaloneVideo.playlistId || courseStandaloneVideo.youtubePlaylistId)
      ) {
        const preferredSubjectTags = resolvePreferredSubjectTags(preferredSubjects);

        if (
          courseStandaloneVideo.creatorId === "freecodecamp" &&
          preferredSubjectsAreUserSelected &&
          preferredSubjectTags.some((tag) => tag !== courseStandaloneVideo.subject)
        ) {
          return [];
        }

        const preferredSubjectVideos = preferredSubjectTags
          .filter((tag) => tag !== courseStandaloneVideo.subject)
          .flatMap((tag) =>
            findVerifiedVideos({
              channel,
              subjectTag: tag,
              language,
            })
          );

        if (preferredSubjectVideos.length > 0) {
          return preferredSubjectVideos
            .sort((left, right) => {
              const leftOrder = Number(left.creatorRoadmapOrder);
              const rightOrder = Number(right.creatorRoadmapOrder);

              return (
                (Number.isFinite(leftOrder) ? leftOrder : 9999) -
                (Number.isFinite(rightOrder) ? rightOrder : 9999)
              );
            })
            .map((video) =>
              toLectureVideoFromVerifiedVideo({
                video,
                channel,
                subject: video.subjectName || getSubjectLabel(video.subject),
                subjectTag: video.subject || subjectTag,
                score: 100,
              })
            );
        }

        const exactSubjectVideos = findVerifiedVideos({
          channel,
          subjectTag,
          language,
        });

        if (
          courseStandaloneVideo.subject !== subjectTag &&
          exactSubjectVideos.length > 0
        ) {
          return exactSubjectVideos
            .sort((left, right) => {
              const leftOrder = Number(left.creatorRoadmapOrder);
              const rightOrder = Number(right.creatorRoadmapOrder);

              return (
                (Number.isFinite(leftOrder) ? leftOrder : 9999) -
                (Number.isFinite(rightOrder) ? rightOrder : 9999)
              );
            })
            .map((video) =>
              toLectureVideoFromVerifiedVideo({
                video,
                channel,
                subject,
                subjectTag,
                score: 100,
              })
            );
        }

        return [
          toLectureVideoFromVerifiedVideo({
            video: courseStandaloneVideo,
            channel,
            subject: courseStandaloneVideo.subjectName || subject,
            subjectTag: courseStandaloneVideo.subject || subjectTag,
            score: 100,
          }),
        ];
      }

      const roadmapId =
        CREATOR_ROADMAP_VIDEO_IDS[`${channel.id}:${subjectTag}`] ||
        CREATOR_ROADMAP_VIDEO_IDS[channel.id] ||
        "";

      return (
        roadmapId
        ? VERIFIED_VIDEOS.filter(
            (video) =>
              video.channelId === channel.youtubeChannelId &&
              video.language === language &&
              video.creatorRoadmapId === roadmapId
          )
        : findVerifiedVideos({
            channel,
            subjectTag,
            language,
          })
      )
      // Some selected creators use a protected standalone-video roadmap before
      // playlist recommendations. Keep those exact user-provided videos instead
      // of falling back to broad creator playlists or generic search results.
      .filter((video) => !roadmapId || video.creatorRoadmapId === roadmapId)
      .sort((left, right) => {
        const leftOrder = Number(left.creatorRoadmapOrder);
        const rightOrder = Number(right.creatorRoadmapOrder);

        return (
          (Number.isFinite(leftOrder) ? leftOrder : 9999) -
          (Number.isFinite(rightOrder) ? rightOrder : 9999)
        );
      })
      .map((video) =>
        toLectureVideoFromVerifiedVideo({
          video,
          channel,
          subject,
          subjectTag,
          score: 100,
        })
      );
    }
  );

const buildCuratedStarterRecommendations = ({
  candidateChannels,
  language,
  subject,
  subjectTag,
  semester,
  topic,
  course,
}) =>
  candidateChannels.flatMap(({ channel }) =>
    findPrimaryCreatorPlaylists({
      channel,
      subjectTag,
      language,
      topic,
      subject,
      course,
    })
      .map((playlist) =>
        toLectureVideoFromCuratedPlaylist({
          playlist,
          channel,
          subject,
          subjectTag,
          semester: playlist.semester || semester,
          language,
          score: getCuratedStarterScore({ playlist, topic, subject }),
        })
      )
  );

const buildNoVideoFallback = ({
  topic,
  subject,
  subjectTag,
  semester,
  language,
  preferredChannels,
}) => {
  const selectedCreators = preferredChannels
    .map(resolveChannel)
    .filter(Boolean)
    .map((channel) => channel.name);
  const subjectName = getSubjectLabel(subjectTag);
  const creatorText = selectedCreators.length
    ? ` from ${selectedCreators.join(", ")}`
    : "";

  return {
    videoTitle: `No ${subjectName} playlist found${creatorText}.`,
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${topic} ${subject} ${language}`
    )}`,
    videoEmbedUrl: "",
    videoThumbnailUrl: "",
    videoDurationLabel: "",
    videoDurationSeconds: 0,
    videoViews: 0,
    videoChannel: "No verified channel",
    videoChannelId: "",
    creatorName: selectedCreators.join(", ") || "",
    creator: selectedCreators.join(", ") || "",
    channelName: selectedCreators.join(", ") || "",
    course: subjectName,
    source: "fallback",
    videoId: "",
    videoLanguage: language,
    videoSubject: subject,
    videoSubjectTag: subjectTag,
    videoSemester: semester,
    videoVerified: false,
    recommendationScore: 0,
    recommendationConfidence: "none",
    recommendationReason:
      selectedCreators.length
        ? `No ${subjectName} playlist found from ${selectedCreators.join(", ")}. Try another subject or clear the creator filter.`
        : `No verified ${language} ${subjectName} playlist is available in the LearnNexus catalog yet.`,
    fallbackUsed: false,
  };
};

const sameText = (left = "", right = "") => normalizeKey(left) === normalizeKey(right);

const isStrictCuratedAlternative = (primaryVideo, video) => {
  if (primaryVideo.source !== "curated") {
    return true;
  }

  if (video.source !== "curated") {
    return false;
  }

  if (!sameText(primaryVideo.creator || primaryVideo.creatorName, video.creator || video.creatorName)) {
    return false;
  }

  if (!sameText(primaryVideo.course, video.course)) {
    const sameRoadmap =
      primaryVideo.creatorRoadmapId &&
      video.creatorRoadmapId &&
      primaryVideo.creatorRoadmapId === video.creatorRoadmapId;

    if (!sameRoadmap) {
      return false;
    }
  }

  if (
    primaryVideo.creatorRoadmapId &&
    video.creatorRoadmapId &&
    primaryVideo.creatorRoadmapId === video.creatorRoadmapId
  ) {
    const primaryOrder = Number(primaryVideo.creatorRoadmapOrder);
    const videoOrder = Number(video.creatorRoadmapOrder);

    return !Number.isFinite(primaryOrder) || !Number.isFinite(videoOrder) || videoOrder > primaryOrder;
  }

  if (primaryVideo.playlistId) {
    return video.playlistId === primaryVideo.playlistId;
  }

  return !video.playlistId && sameText(primaryVideo.course, video.course);
};

const findLectureVideos = async ({
  topic,
  subject,
  course,
  year,
  preferredChannels = [],
  preferredSubjects = [],
  preferredSubjectsAreUserSelected = true,
  language = "English",
}) => {
  const subjectTag = resolveSubjectTag(subject, topic);
  const selectedSubjectTags = filterPreferredSubjectTagsForCourse(
    resolvePreferredSubjectTags(preferredSubjects),
    course
  );
  const effectiveSubjectTag = selectedSubjectTags.length
    ? selectedSubjectTags.includes(subjectTag)
      ? subjectTag
      : selectedSubjectTags[0]
    : subjectTag;
  const effectiveSubject = getSubjectLabel(effectiveSubjectTag);
  const semester = semesterFromYear(year);
  const branch = resolveBranchTag(course);
  const cacheKey = [
    "recommendations",
    RECOMMENDATION_CACHE_VERSION,
    normalizeKey(topic),
    normalizeKey(subject),
    selectedSubjectTags.sort().join("."),
    normalizeKey(course),
    semester,
    language,
    preferredChannels.map(normalizeKey).sort().join("."),
  ].join(":");
  const cached = await getCache(cacheKey);
  const preferredSelectedChannel = preferredChannels[0]
    ? resolveChannel(preferredChannels[0])
    : null;

  if (cached) {
    if (
      !recommendationMatchesSelectedCuratedVideo({
        recommendation: cached,
        course,
        language,
        preferredChannels,
      })
    ) {
      logger.info("Ignoring stale cached recommendation for exact curated video mapping", {
        course,
        language,
        preferredChannels,
        cachedVideoId:
          cached.videoId ||
          getVideoIdFromAnyUrl(cached.videoUrl) ||
          getVideoIdFromAnyUrl(cached.youtubeLink) ||
          getVideoIdFromAnyUrl(cached.videoEmbedUrl),
      });
    } else {
      logRecommendationDebug({
        selectedChannel: preferredSelectedChannel,
        result: cached,
        sourceOfData: "cache",
      });
      return cached;
    }
  }

  const candidateChannels = buildCandidateChannels({
    preferredChannels,
    language,
    subjectTag: effectiveSubjectTag,
    semester,
    branch,
    course,
  });
  const selectedCuratedPlaylistIds = getSelectedCuratedPlaylistIds({
    candidateChannels,
    subjectTag: effectiveSubjectTag,
    language,
    topic,
    subject: effectiveSubject,
    course,
  });

  if (candidateChannels.length === 0) {
    const fallback = buildNoVideoFallback({
      topic,
      subject: effectiveSubject,
      subjectTag: effectiveSubjectTag,
      semester,
      language,
      preferredChannels,
    });
    await setCache(cacheKey, fallback, CACHE_TTL_SECONDS);
    return fallback;
  }

  const recommendations = [];
  const curatedStarterRecommendations = buildCuratedStarterRecommendations({
    candidateChannels,
    language,
    subject: effectiveSubject,
    subjectTag: effectiveSubjectTag,
    semester,
    topic,
    course,
  });

  // Manual creator playlist starters are the source of truth for selected
  // creators. Imported MongoDB rows are still used for "More videos", but they
  // must not replace the exact configured starter URL/video.
  recommendations.push(...curatedStarterRecommendations);
  recommendations.push(
    ...buildCuratedStandaloneVideoRecommendations({
      candidateChannels,
      language,
      subject: effectiveSubject,
      subjectTag: effectiveSubjectTag,
      course,
      preferredSubjects,
      preferredSubjectsAreUserSelected,
    })
  );

  const catalogRecommendations = await findCatalogLectureVideos({
    candidateChannels,
    language,
    subject: effectiveSubject,
    subjectTag: effectiveSubjectTag,
    semester,
    topic,
    preferredChannels,
    selectedCuratedPlaylistIds,
  });

  recommendations.push(...catalogRecommendations);

  if (catalogRecommendations.length === 0) {
    const playlistBackedChannels = candidateChannels
      .map(({ channel, fallbackUsed }) => ({
        channel,
        fallbackUsed,
        playlists: findPrimaryCreatorPlaylists({
          channel,
          subjectTag: effectiveSubjectTag,
          language,
          topic,
          subject: effectiveSubject,
          course,
        }),
      }))
      .filter(({ playlists }) => playlists.length > 0);

    for (const { channel, fallbackUsed, playlists } of playlistBackedChannels) {
      for (const playlist of playlists) {
        try {
          const videos = orderPlaylistVideos(
            await fetchYouTubePlaylistVideos({ playlist, channel }),
            playlist
          );
          const playlistScore = Math.max(90, 98 - (Number(playlist.pathOrder) || 0) / 100);

          videos.forEach((video) => {
            recommendations.push(
              toLectureVideo({
                video,
                channel,
                playlist,
                subject: effectiveSubject,
                subjectTag: effectiveSubjectTag,
                semester: playlist.semester || semester,
                language,
                score: playlistScore,
                fallbackUsed,
              })
            );
          });
        } catch (error) {
          logger.warn("Verified YouTube playlist page recommendation failed", {
            channel: channel.name,
            playlistId: playlist.youtubePlaylistId,
            subject,
            error: error.message,
          });
        }
      }
    }

    const videoBackedRecommendations = candidateChannels.flatMap(({ channel }) =>
      findVerifiedVideos({
        channel,
        subjectTag: effectiveSubjectTag,
        language,
      }).map((video) =>
        toLectureVideoFromVerifiedVideo({
          video,
          channel,
          subject: effectiveSubject,
          subjectTag: effectiveSubjectTag,
          score: 97,
        })
      )
    );

    recommendations.push(...videoBackedRecommendations);

    const shouldUseBroadSearch =
      playlistBackedChannels.length === 0 && videoBackedRecommendations.length === 0;

    for (const { channel, fallbackUsed } of shouldUseBroadSearch ? candidateChannels : []) {
      const query = buildSearchQuery({
        topic,
        subject: effectiveSubject,
        course,
        semester,
        language,
        channel,
      });

      try {
        const videos = await searchYouTubeVideos(query);

        videos.forEach((video) => {
          const selectedChannel =
            preferredChannels.length > 0 ? candidateChannels[0]?.channel : null;
          const score = scoreVideo({
            video,
            channel,
            subjectTag: effectiveSubjectTag,
            semester,
            selectedChannelId: selectedChannel?.youtubeChannelId,
            topic,
            language,
          });

          if (score >= MIN_ACCURACY_SCORE) {
            recommendations.push(
              toLectureVideo({
                video,
                channel,
                subject: effectiveSubject,
                subjectTag: effectiveSubjectTag,
                semester,
                language,
                score,
                fallbackUsed,
              })
            );
          }
        });
      } catch (error) {
        logger.warn("Strict YouTube recommendation search failed", {
          channel: channel.name,
          subject,
          error: error.message,
        });
      }
    }
  }

  const seen = new Set();
  const deduped = recommendations
    .sort((left, right) => {
      if (left.fallbackUsed !== right.fallbackUsed) {
        return left.fallbackUsed ? 1 : -1;
      }

      return right.recommendationScore - left.recommendationScore;
    })
    .filter((video) => {
      const videoId = getVideoIdFromLink(video.videoUrl) || video.videoEmbedUrl || video.videoUrl;

      if (seen.has(videoId)) {
        return false;
      }

      seen.add(videoId);
      return true;
    });

  if (deduped.length === 0) {
    const fallback = buildNoVideoFallback({
      topic,
      subject: effectiveSubject,
      subjectTag: effectiveSubjectTag,
      semester,
      language,
      preferredChannels,
    });
    await setCache(cacheKey, fallback, CACHE_TTL_SECONDS);
    return fallback;
  }

  const [primaryVideo, ...rankedAlternativeVideos] = deduped;
  const playlistContinuationVideos = await findPlaylistContinuationVideos({
    primaryVideo,
    subject: effectiveSubject,
    subjectTag: effectiveSubjectTag,
    semester,
  });
  const rejectedAlternatives = [];
  const seenAlternatives = new Set([
    getVideoIdFromLink(primaryVideo.videoUrl) || primaryVideo.videoEmbedUrl || primaryVideo.videoUrl,
  ]);
  const alternativeVideos = [...playlistContinuationVideos, ...rankedAlternativeVideos]
    .filter((video) => {
      const keep = isStrictCuratedAlternative(primaryVideo, video);

      if (!keep) {
        rejectedAlternatives.push(video);
      }

      return keep;
    })
    .filter((video) => {
      const videoId = getVideoIdFromLink(video.videoUrl) || video.videoEmbedUrl || video.videoUrl;

      if (seenAlternatives.has(videoId)) {
        return false;
      }

      seenAlternatives.add(videoId);
      return true;
    });
  const result = {
    ...primaryVideo,
    alternativeVideos,
  };

  logRecommendationDebug({
    selectedChannel: preferredSelectedChannel,
    result,
    sourceOfData:
      primaryVideo.source === "curated"
        ? "backend-api/manual-curated"
        : primaryVideo.source || "backend-api",
  });

  if (primaryVideo.source === "curated") {
    logCuratedSelection({
      selectedCreator: primaryVideo.creator || primaryVideo.creatorName || primaryVideo.videoChannel,
      selectedCourse: primaryVideo.course,
      selectedPlaylistId: primaryVideo.playlistId || "",
      returned: 1 + alternativeVideos.length,
      rejected: rejectedAlternatives,
    });
  }

  await setCache(cacheKey, result, CACHE_TTL_SECONDS);
  return result;
};

const getLanguageChannels = (language = "English") =>
  CHANNELS_BY_LANGUAGE[language] || CHANNELS_BY_LANGUAGE.English;

const findPlaylistContinuationVideos = async ({ primaryVideo, subject, subjectTag, semester }) => {
  if (
    mongoose.connection.readyState !== 1 ||
    !primaryVideo?.playlistId ||
    !primaryVideo?.videoChannelId
  ) {
    return [];
  }

  const videos = await Video.find({
    playlistId: primaryVideo.playlistId,
    channelId: primaryVideo.videoChannelId,
    ...(primaryVideo.creatorName || primaryVideo.creator || primaryVideo.videoChannel
      ? {
          creatorName:
            primaryVideo.creatorName || primaryVideo.creator || primaryVideo.videoChannel,
        }
      : {}),
    subject: subjectTag,
    language: primaryVideo.videoLanguage,
    verified: true,
    unavailable: { $ne: true },
  })
    .sort({ playlistPosition: 1, updatedAt: -1 })
    .lean();
  const primaryVideoId = getVideoIdFromLink(primaryVideo.videoUrl);
  const channel = resolveChannel(primaryVideo.videoChannelId) || {
    name: primaryVideo.videoChannel,
    youtubeChannelId: primaryVideo.videoChannelId,
  };
  const primaryPosition = Number(primaryVideo.playlistPosition);
  const hasPrimaryPosition = Number.isFinite(primaryPosition);
  const afterPrimary = [];
  const beforePrimary = [];

  videos.forEach((video) => {
    if (video.youtubeVideoId === primaryVideoId) {
      return;
    }

    if (hasPrimaryPosition && Number(video.playlistPosition) > primaryPosition) {
      afterPrimary.push(video);
      return;
    }

    beforePrimary.push(video);
  });

  return [...afterPrimary, ...beforePrimary].map((video) =>
    toLectureVideoFromCatalog({
      video,
      channel,
      subject,
      subjectTag,
      semester,
      score: 96,
    })
  );
};

module.exports = {
  CHANNELS_BY_LANGUAGE,
  RECOMMENDED_CHANNELS,
  fetchYouTubePlaylistVideos,
  getLanguageChannels,
  findLectureVideos,
  orderPlaylistVideos,
};
