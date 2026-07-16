const Playlist = require("../../../models/Playlist");
const Video = require("../../../models/Video");
const mongoose = require("mongoose");
const env = require("../../../config/env");
const {
  getSubjectLabel,
  normalizeKey,
  resolveChannel,
  resolveSubjectTag,
} = require("../../../data/recommendationCatalog");
const ApiError = require("../../../utils/apiError");
const logger = require("../../../utils/logger");

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS_PER_PAGE = 50;
const MAX_IMPORT_LOGS = 200;
const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
const RETRYABLE_REASONS = new Set([
  "backendError",
  "internalError",
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);
const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded"]);

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const extractPlaylistId = (value = "") => {
  const trimmed = String(value).trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("list") || "";
  } catch (_error) {
    return trimmed;
  }
};

const readYoutubeError = async (response) => {
  try {
    const payload = await response.json();
    const reason = payload?.error?.errors?.[0]?.reason || payload?.error?.status || "";
    const message = payload?.error?.message || response.statusText;

    return { reason, message };
  } catch (_error) {
    return { reason: "", message: response.statusText };
  }
};

const youtubeFetch = async (path, params = {}, attempt = 1) => {
  if (!env.youtubeApiKey) {
    throw new ApiError(503, "YOUTUBE_API_KEY is required for playlist imports.");
  }

  const url = new URL(`${YOUTUBE_API_BASE_URL}/${path}`);
  Object.entries({
    key: env.youtubeApiKey,
    ...params,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);

  if (response.ok) {
    return response.json();
  }

  const errorDetails = await readYoutubeError(response);

  if (QUOTA_REASONS.has(errorDetails.reason)) {
    const error = new ApiError(429, "YouTube API quota exhausted during playlist import.");
    error.code = "YOUTUBE_QUOTA_EXHAUSTED";
    error.details = errorDetails;
    throw error;
  }

  const retryable =
    RETRYABLE_STATUSES.has(response.status) || RETRYABLE_REASONS.has(errorDetails.reason);

  if (retryable && attempt < 5) {
    await sleep(500 * 2 ** (attempt - 1));
    return youtubeFetch(path, params, attempt + 1);
  }

  const error = new ApiError(
    response.status,
    `YouTube API request failed: ${errorDetails.message}`
  );
  error.details = errorDetails;
  throw error;
};

const buildLogEntry = (event, message, level = "info", meta = {}) => ({
  at: new Date(),
  event,
  level,
  message,
  meta,
});

const pushPlaylistLog = (playlist, event, message, level = "info", meta = {}) => {
  playlist.importLog = [
    ...(playlist.importLog || []),
    buildLogEntry(event, message, level, meta),
  ].slice(-MAX_IMPORT_LOGS);

  const logMethod = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  logger[logMethod](message, { event, playlistId: playlist.youtubePlaylistId, ...meta });
};

const getThumbnail = (snippet = {}) => {
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

const getPlaylistDetails = async (youtubePlaylistId) => {
  const payload = await youtubeFetch("playlists", {
    part: "snippet,contentDetails",
    id: youtubePlaylistId,
    maxResults: 1,
  });
  const playlist = payload.items?.[0];

  if (!playlist) {
    throw new ApiError(404, "YouTube playlist was not found.");
  }

  return {
    id: playlist.id,
    title: playlist.snippet?.title || "Untitled playlist",
    channelId: playlist.snippet?.channelId || "",
    channelTitle: playlist.snippet?.channelTitle || "",
    description: playlist.snippet?.description || "",
    thumbnail: getThumbnail(playlist.snippet),
    videoCount: Number(playlist.contentDetails?.itemCount) || 0,
  };
};

const getPlaylistItemsPage = async ({ youtubePlaylistId, pageToken }) =>
  youtubeFetch("playlistItems", {
    part: "snippet,contentDetails,status",
    playlistId: youtubePlaylistId,
    maxResults: MAX_RESULTS_PER_PAGE,
    pageToken,
  });

const inferSubjectTag = ({ subject, title, description }) =>
  resolveSubjectTag(subject || title || "", description || title || "");

const resolveExpectedChannel = ({ channelId, creatorName, playlistDetails }) => {
  const resolvedChannel = resolveChannel(channelId) || resolveChannel(creatorName);

  return {
    channelId: channelId || resolvedChannel?.youtubeChannelId || playlistDetails.channelId,
    creatorName: creatorName || resolvedChannel?.name || playlistDetails.channelTitle,
    creatorId: resolvedChannel?.id || "",
    language: resolvedChannel?.language,
  };
};

const upsertPlaylist = async ({ playlistDetails, metadata, youtubePlaylistId }) => {
  const expectedChannel = resolveExpectedChannel({
    channelId: metadata.channelId,
    creatorName: metadata.creatorName,
    playlistDetails,
  });

  if (playlistDetails.channelId !== expectedChannel.channelId) {
    throw new ApiError(
      400,
      `Playlist owner mismatch. Expected ${expectedChannel.channelId}, got ${playlistDetails.channelId}.`
    );
  }

  const subjectTag = inferSubjectTag({
    subject: metadata.subject,
    title: metadata.playlistTitle || playlistDetails.title,
    description: playlistDetails.description,
  });
  const subjectName = metadata.subjectName || getSubjectLabel(subjectTag);

  return Playlist.findOneAndUpdate(
    { youtubePlaylistId },
    {
      title: playlistDetails.title,
      youtubePlaylistId,
      channelId: expectedChannel.channelId,
      creatorName: expectedChannel.creatorName,
      creatorId: expectedChannel.creatorId,
      subject: subjectTag,
      subjectName,
      playlistTitle: metadata.playlistTitle || playlistDetails.title,
      semester: Number(metadata.semester) || 3,
      language: metadata.language || expectedChannel.language || "Hindi",
      tags: Array.from(
        new Set([
          ...(metadata.tags || []),
          normalizeKey(subjectName),
          normalizeKey(expectedChannel.creatorName),
        ].filter(Boolean))
      ),
      verified: metadata.verified !== false,
      public: metadata.public !== false,
      videoCount: playlistDetails.videoCount,
      thumbnail: playlistDetails.thumbnail,
      youtubeLink: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`,
      importStatus: "importing",
      importStartedAt: new Date(),
      importCompletedAt: null,
      importError: "",
    },
    { new: true, upsert: true, runValidators: true }
  );
};

const isUnavailableVideo = (item) => {
  const title = item.snippet?.title || "";
  const privacyStatus = item.status?.privacyStatus || "";

  return (
    privacyStatus === "private" ||
    title.toLowerCase() === "deleted video" ||
    title.toLowerCase() === "private video"
  );
};

const validatePlaylistItem = ({ item, playlist }) => {
  const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
  const ownerChannelId = item.snippet?.videoOwnerChannelId || item.snippet?.channelId || "";

  if (!videoId) {
    return {
      valid: false,
      reason: "missing_video_id",
      message: "Skipped playlist item without a video id.",
    };
  }

  if (isUnavailableVideo(item)) {
    return {
      valid: false,
      reason: "unavailable",
      message: "Skipped private or deleted playlist item.",
      videoId,
    };
  }

  if (ownerChannelId && ownerChannelId !== playlist.channelId) {
    return {
      valid: false,
      reason: "channel_mismatch",
      message: "Skipped video because it belongs to a different channel.",
      videoId,
      ownerChannelId,
    };
  }

  return {
    valid: true,
    videoId,
    ownerChannelId,
  };
};

const toVideoUpdate = ({ item, playlist, videoId, ownerChannelId }) => {
  const snippet = item.snippet || {};
  const position = Number.isInteger(snippet.position) ? snippet.position : undefined;

  return {
    youtubeVideoId: videoId,
    playlistId: playlist.youtubePlaylistId,
    playlistItemId: item.id,
    playlistPosition: position,
    channelId: playlist.channelId,
    videoOwnerChannelId: ownerChannelId || playlist.channelId,
    creatorName: playlist.creatorName,
    creatorId: playlist.creatorId,
    subject: playlist.subject,
    subjectName: playlist.subjectName,
    playlistTitle: playlist.playlistTitle || playlist.title,
    language: playlist.language,
    semester: playlist.semester,
    title: snippet.title || "Untitled video",
    verified: playlist.verified,
    thumbnail: getThumbnail(snippet),
    youtubeLink: `https://www.youtube.com/watch?v=${videoId}&list=${playlist.youtubePlaylistId}`,
    relevanceScore: ownerChannelId && ownerChannelId === playlist.channelId ? 100 : 90,
    relevanceConfidence: "high",
    unavailable: false,
  };
};

const importPlaylistPage = async ({ playlist, pageToken }) => {
  const page = await getPlaylistItemsPage({
    youtubePlaylistId: playlist.youtubePlaylistId,
    pageToken,
  });
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const item of page.items || []) {
    const validation = validatePlaylistItem({ item, playlist });

    if (!validation.valid) {
      skipped += 1;
      pushPlaylistLog(playlist, validation.reason, validation.message, "warn", validation);
      continue;
    }

    const update = toVideoUpdate({
      item,
      playlist,
      videoId: validation.videoId,
      ownerChannelId: validation.ownerChannelId,
    });
    const existing = await Video.findOne({
      playlistId: playlist.youtubePlaylistId,
      youtubeVideoId: validation.videoId,
    });

    if (existing) {
      duplicates += 1;
      pushPlaylistLog(playlist, "duplicate_video", "Updated duplicate playlist video.", "info", {
        videoId: validation.videoId,
        position: update.playlistPosition,
      });
    }

    await Video.findOneAndUpdate(
      {
        playlistId: playlist.youtubePlaylistId,
        youtubeVideoId: validation.videoId,
      },
      update,
      { new: true, upsert: true, runValidators: true }
    );
    imported += 1;
  }

  playlist.importedVideoCount = (playlist.importedVideoCount || 0) + imported;
  playlist.skippedVideoCount = (playlist.skippedVideoCount || 0) + skipped;
  playlist.duplicateVideoCount = (playlist.duplicateVideoCount || 0) + duplicates;
  playlist.importNextPageToken = page.nextPageToken || "";
  playlist.lastImportedAt = new Date();
  pushPlaylistLog(playlist, "playlist_page_imported", "Imported one playlist page.", "info", {
    imported,
    skipped,
    duplicates,
    nextPageToken: page.nextPageToken || "",
  });
  await playlist.save();

  return page.nextPageToken || "";
};

const importPlaylist = async ({
  playlistUrl,
  youtubePlaylistId: explicitPlaylistId,
  continueExisting = false,
  maxPages = 0,
  ...metadata
}) => {
  const youtubePlaylistId = extractPlaylistId(explicitPlaylistId || playlistUrl);

  if (!youtubePlaylistId) {
    throw new ApiError(400, "A valid YouTube playlist id or URL is required.");
  }

  const playlistDetails = await getPlaylistDetails(youtubePlaylistId);
  const playlist = await upsertPlaylist({ playlistDetails, metadata, youtubePlaylistId });

  if (!continueExisting) {
    playlist.importedVideoCount = 0;
    playlist.skippedVideoCount = 0;
    playlist.duplicateVideoCount = 0;
    playlist.importNextPageToken = "";
    playlist.importLog = [];
  }

  pushPlaylistLog(playlist, "playlist_import_started", "Playlist import started.", "info", {
    title: playlistDetails.title,
    videoCount: playlistDetails.videoCount,
    channelId: playlist.channelId,
    subject: playlist.subject,
  });
  await playlist.save();

  let pageToken = continueExisting ? playlist.importNextPageToken || "" : "";
  let pageCount = 0;

  try {
    do {
      pageToken = await importPlaylistPage({ playlist, pageToken });
      pageCount += 1;
    } while (pageToken && (!maxPages || pageCount < Number(maxPages)));

    if (!pageToken) {
      playlist.importStatus = "completed";
      playlist.importCompletedAt = new Date();
      pushPlaylistLog(playlist, "playlist_import_completed", "Playlist import completed.", "info", {
        importedVideoCount: playlist.importedVideoCount,
        skippedVideoCount: playlist.skippedVideoCount,
        duplicateVideoCount: playlist.duplicateVideoCount,
      });
    } else {
      playlist.importStatus = "queued";
      pushPlaylistLog(playlist, "playlist_import_paused", "Playlist import paused after batch.", "info", {
        nextPageToken: pageToken,
      });
    }

    await playlist.save();
    return playlist;
  } catch (error) {
    playlist.importStatus =
      error.code === "YOUTUBE_QUOTA_EXHAUSTED" ? "quota_exhausted" : "failed";
    playlist.importError = error.message;
    pushPlaylistLog(playlist, "playlist_import_failed", error.message, "error", {
      code: error.code,
      details: error.details,
      nextPageToken: playlist.importNextPageToken,
    });
    await playlist.save();
    throw error;
  }
};

const continuePlaylistImport = async (playlistIdOrYoutubeId, options = {}) => {
  const playlist =
    (await Playlist.findOne({ youtubePlaylistId: playlistIdOrYoutubeId })) ||
    (mongoose.isValidObjectId(playlistIdOrYoutubeId)
      ? await Playlist.findById(playlistIdOrYoutubeId)
      : null);

  if (!playlist) {
    throw new ApiError(404, "Playlist import state was not found.");
  }

  return importPlaylist({
    youtubePlaylistId: playlist.youtubePlaylistId,
    channelId: playlist.channelId,
    creatorName: playlist.creatorName,
    subject: playlist.subject,
    subjectName: playlist.subjectName,
    playlistTitle: playlist.playlistTitle,
    semester: playlist.semester,
    language: playlist.language,
    tags: playlist.tags,
    verified: playlist.verified,
    public: playlist.public,
    continueExisting: true,
    maxPages: options.maxPages,
  });
};

const resumePendingPlaylistImports = async ({ maxPlaylists = 5, maxPagesPerPlaylist = 20 } = {}) => {
  if (!env.youtubeApiKey) {
    logger.warn("Skipping playlist import resume because YOUTUBE_API_KEY is not configured.");
    return [];
  }

  const pendingPlaylists = await Playlist.find({
    importStatus: { $in: ["queued", "importing", "failed"] },
  })
    .sort({ lastImportedAt: 1, updatedAt: 1 })
    .limit(maxPlaylists);
  const results = [];

  for (const playlist of pendingPlaylists) {
    try {
      const resumed = await continuePlaylistImport(playlist.youtubePlaylistId, {
        maxPages: maxPagesPerPlaylist,
      });
      results.push({
        youtubePlaylistId: resumed.youtubePlaylistId,
        status: resumed.importStatus,
        importedVideoCount: resumed.importedVideoCount,
      });
    } catch (error) {
      logger.error("Pending playlist resume failed", {
        playlistId: playlist.youtubePlaylistId,
        error,
      });
      results.push({
        youtubePlaylistId: playlist.youtubePlaylistId,
        status: "failed",
        error: error.message,
      });
    }
  }

  return results;
};

module.exports = {
  MAX_RESULTS_PER_PAGE,
  continuePlaylistImport,
  extractPlaylistId,
  importPlaylist,
  resumePendingPlaylistImports,
};
