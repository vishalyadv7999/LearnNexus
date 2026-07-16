const Playlist = require("../../../models/Playlist");
const User = require("../../../models/User");
const Video = require("../../../models/Video");
const {
  CREATOR_PLAYLISTS,
  REQUIRED_CREATOR_PLAYLIST_MAPPINGS,
} = require("../../../data/curatedLearningCatalog");
const { resolveChannel } = require("../../../data/recommendationCatalog");
const logger = require("../../../utils/logger");

const getWatchUrl = (videoId, playlistId = "") =>
  videoId
    ? `https://www.youtube.com/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ""}`
    : "";

const getThumbnail = (videoId) =>
  videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

const syncPlaylistMapping = async (mapping) => {
  const playlistId = mapping.youtubePlaylistId || mapping.playlistId;
  const startVideoId = mapping.startVideoId;

  if (!playlistId || !startVideoId) {
    return {
      creatorId: mapping.creatorId,
      creatorName: mapping.creatorName,
      playlistId: playlistId || "",
      playlistUpdated: false,
      starterVideoUpdated: false,
      staleVideosMarked: 0,
    };
  }

  const playlistUpdate = await Playlist.updateOne(
    { youtubePlaylistId: playlistId },
    {
      $set: {
        title: mapping.title || mapping.playlistTitle,
        youtubePlaylistId: playlistId,
        channelId: mapping.channelId,
        creatorName: mapping.creatorName,
        creatorId: mapping.creatorId,
        subject: mapping.subject,
        subjectName: mapping.subjectName,
        playlistTitle: mapping.playlistTitle || mapping.title,
        semester: mapping.semester || 1,
        language: mapping.language,
        tags: mapping.tags || [],
        verified: true,
        public: true,
        thumbnail: getThumbnail(startVideoId),
        youtubeLink: mapping.playlistUrl || getWatchUrl(startVideoId, playlistId),
      },
      $setOnInsert: {
        importStatus: "idle",
        videoCount: 0,
        importedVideoCount: 0,
        skippedVideoCount: 0,
        duplicateVideoCount: 0,
      },
    },
    { upsert: true, runValidators: true }
  );

  const starterVideoUpdate = await Video.updateOne(
    {
      playlistId,
      youtubeVideoId: startVideoId,
    },
    {
      $set: {
        youtubeVideoId: startVideoId,
        playlistId,
        channelId: mapping.channelId,
        videoOwnerChannelId: mapping.channelId,
        creatorName: mapping.creatorName,
        creatorId: mapping.creatorId,
        subject: mapping.subject,
        subjectName: mapping.subjectName,
        playlistTitle: mapping.playlistTitle || mapping.title,
        playlistPosition: 0,
        language: mapping.language,
        semester: mapping.semester || 1,
        title: mapping.playlistTitle || mapping.title,
        verified: true,
        unavailable: false,
        thumbnail: getThumbnail(startVideoId),
        youtubeLink: mapping.playlistUrl || getWatchUrl(startVideoId, playlistId),
        relevanceScore: 100,
        relevanceConfidence: "high",
      },
    },
    { upsert: true, runValidators: true }
  );

  const staleVideoUpdate = await Video.updateMany(
    {
      playlistId,
      $or: [
        { channelId: { $ne: mapping.channelId } },
        { creatorName: { $ne: mapping.creatorName } },
        { subject: { $ne: mapping.subject } },
        { language: { $ne: mapping.language } },
      ],
    },
    {
      $set: {
        verified: false,
        unavailable: true,
      },
    }
  );

  await Video.updateMany(
    {
      playlistId,
      channelId: mapping.channelId,
      creatorName: mapping.creatorName,
      subject: mapping.subject,
      language: mapping.language,
    },
    {
      $set: {
        creatorId: mapping.creatorId,
        playlistTitle: mapping.playlistTitle || mapping.title,
        subjectName: mapping.subjectName,
      },
    }
  );

  return {
    creatorId: mapping.creatorId,
    creatorName: mapping.creatorName,
    playlistId,
    playlistUpdated: playlistUpdate.modifiedCount > 0 || playlistUpdate.upsertedCount > 0,
    starterVideoUpdated:
      starterVideoUpdate.modifiedCount > 0 || starterVideoUpdate.upsertedCount > 0,
    staleVideosMarked: staleVideoUpdate.modifiedCount || 0,
  };
};

const syncStandaloneVideoMapping = async (mapping) => {
  const update = await Video.updateOne(
    {
      playlistId: "",
      youtubeVideoId: mapping.youtubeVideoId,
    },
    {
      $set: {
        youtubeVideoId: mapping.youtubeVideoId,
        playlistId: "",
        channelId: mapping.channelId,
        videoOwnerChannelId: mapping.channelId,
        creatorName: mapping.creatorName,
        creatorId: mapping.creatorId,
        subject: mapping.subject,
        subjectName: mapping.subjectName,
        playlistTitle: "",
        playlistPosition: 0,
        language: mapping.language,
        semester: mapping.semester || 1,
        title: mapping.title,
        verified: true,
        unavailable: false,
        thumbnail: getThumbnail(mapping.youtubeVideoId),
        youtubeLink: mapping.youtubeLink || getWatchUrl(mapping.youtubeVideoId),
        relevanceScore: 100,
        relevanceConfidence: "high",
      },
    },
    { upsert: true, runValidators: true }
  );

  const staleVideoUpdate = await Video.updateMany(
    {
      youtubeVideoId: mapping.youtubeVideoId,
      $or: [
        { channelId: { $ne: mapping.channelId } },
        { creatorName: { $ne: mapping.creatorName } },
        { subject: { $ne: mapping.subject } },
        { language: { $ne: mapping.language } },
      ],
    },
    {
      $set: {
        verified: false,
        unavailable: true,
      },
    }
  );

  return {
    creatorId: mapping.creatorId,
    creatorName: mapping.creatorName,
    videoId: mapping.youtubeVideoId,
    starterVideoUpdated: update.modifiedCount > 0 || update.upsertedCount > 0,
    staleVideosMarked: staleVideoUpdate.modifiedCount || 0,
  };
};

const migrateSavedCreatorPreferences = async () => {
  const users = await User.find({ "preferences.preferredChannels.0": { $exists: true } });
  let updatedUsers = 0;

  for (const user of users) {
    const normalizedChannels = user.preferences.preferredChannels
      .map((channel) => resolveChannel(channel)?.id || String(channel || "").trim())
      .filter(Boolean);

    if (
      normalizedChannels.length !== user.preferences.preferredChannels.length ||
      normalizedChannels.some((channel, index) => channel !== user.preferences.preferredChannels[index])
    ) {
      user.preferences.preferredChannels = normalizedChannels;
      await user.save();
      updatedUsers += 1;
    }
  }

  return updatedUsers;
};

const markConflictingCreatorRowsUnavailable = async () => {
  const playlistMappings = REQUIRED_CREATOR_PLAYLIST_MAPPINGS.filter(
    (mapping) => mapping.youtubePlaylistId || mapping.playlistId
  );
  const videoMappings = REQUIRED_CREATOR_PLAYLIST_MAPPINGS.filter(
    (mapping) => mapping.youtubeVideoId && !(mapping.youtubePlaylistId || mapping.playlistId)
  );
  const allowedPlaylistIds = playlistMappings
    .map((mapping) => mapping.youtubePlaylistId || mapping.playlistId)
    .filter(Boolean);
  const allowedStandaloneVideoIds = videoMappings
    .map((mapping) => mapping.youtubeVideoId)
    .filter(Boolean);
  const requiredCreatorIds = Object.keys(CREATOR_PLAYLISTS);
  const requiredChannelIds = REQUIRED_CREATOR_PLAYLIST_MAPPINGS.map((mapping) => mapping.channelId).filter(Boolean);

  const stalePlaylistUpdate = await Playlist.updateMany(
    {
      $or: [
        { creatorId: { $in: requiredCreatorIds } },
        { channelId: { $in: requiredChannelIds } },
      ],
      youtubePlaylistId: { $nin: allowedPlaylistIds },
    },
    {
      $set: {
        verified: false,
        public: false,
      },
    }
  );

  const staleVideoUpdate = await Video.updateMany(
    {
      $or: [
        { creatorId: { $in: requiredCreatorIds } },
        { channelId: { $in: requiredChannelIds } },
      ],
      $and: [
        {
          $or: [
            { playlistId: { $exists: false } },
            { playlistId: "" },
            { playlistId: { $nin: allowedPlaylistIds } },
          ],
        },
        {
          youtubeVideoId: { $nin: allowedStandaloneVideoIds },
        },
      ],
    },
    {
      $set: {
        verified: false,
        unavailable: true,
      },
    }
  );

  return {
    stalePlaylistsMarked: stalePlaylistUpdate.modifiedCount || 0,
    staleVideosMarked: staleVideoUpdate.modifiedCount || 0,
  };
};

const syncCuratedPlaylistMappings = async () => {
  const results = [];

  for (const mapping of REQUIRED_CREATOR_PLAYLIST_MAPPINGS) {
    if (mapping.youtubePlaylistId || mapping.playlistId) {
      results.push(await syncPlaylistMapping(mapping));
      continue;
    }

    results.push(await syncStandaloneVideoMapping(mapping));
  }

  const staleCleanup = await markConflictingCreatorRowsUnavailable();
  const updatedUsers = await migrateSavedCreatorPreferences();

  logger.info("Curated playlist mappings synced", {
    sourceOfData: "database-upsert",
    mappings: results,
    staleCleanup,
    updatedUsers,
  });

  return {
    mappings: results,
    staleCleanup,
    updatedUsers,
  };
};

module.exports = {
  syncCuratedPlaylistMappings,
};
