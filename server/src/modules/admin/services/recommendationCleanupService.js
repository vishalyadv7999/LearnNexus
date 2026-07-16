const Playlist = require("../../../models/Playlist");
const Video = require("../../../models/Video");
const { getSubjectLabel, resolveSubjectTag } = require("../../../data/recommendationCatalog");
const logger = require("../../../utils/logger");

const normalizePlaylistSubjects = async () => {
  const playlists = await Playlist.find({});
  let normalized = 0;

  for (const playlist of playlists) {
    const subject = resolveSubjectTag(playlist.subjectName || playlist.subject || playlist.title);
    const subjectName = getSubjectLabel(subject);

    if (playlist.subject !== subject || playlist.subjectName !== subjectName) {
      playlist.subject = subject;
      playlist.subjectName = subjectName;
      await playlist.save();
      normalized += 1;
    }
  }

  return normalized;
};

const removeDuplicateVideos = async () => {
  const duplicateGroups = await Video.aggregate([
    {
      $group: {
        _id: {
          playlistId: "$playlistId",
          youtubeVideoId: "$youtubeVideoId",
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);
  let removed = 0;

  for (const group of duplicateGroups) {
    const [, ...duplicateIds] = group.ids;

    if (duplicateIds.length) {
      const result = await Video.deleteMany({ _id: { $in: duplicateIds } });
      removed += result.deletedCount || 0;
    }
  }

  return removed;
};

const removeCorruptedMappings = async () => {
  const playlists = await Playlist.find({}).lean();
  let removed = 0;

  for (const playlist of playlists) {
    const result = await Video.deleteMany({
      playlistId: playlist.youtubePlaylistId,
      $or: [
        { channelId: { $ne: playlist.channelId } },
        { subject: { $ne: playlist.subject } },
        { language: { $ne: playlist.language } },
      ],
    });
    removed += result.deletedCount || 0;
  }

  return removed;
};

const syncPlaylistMetadata = async () => {
  const playlists = await Playlist.find({});
  let synced = 0;

  for (const playlist of playlists) {
    const [stats] = await Video.aggregate([
      {
        $match: {
          playlistId: playlist.youtubePlaylistId,
          unavailable: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$playlistId",
          count: { $sum: 1 },
          firstThumbnail: { $first: "$thumbnail" },
        },
      },
    ]);

    const nextCount = stats?.count || 0;
    const nextThumbnail = playlist.thumbnail || stats?.firstThumbnail || "";

    if (playlist.importedVideoCount !== nextCount || playlist.thumbnail !== nextThumbnail) {
      playlist.importedVideoCount = nextCount;
      playlist.thumbnail = nextThumbnail;
      await playlist.save();
      synced += 1;
    }
  }

  return synced;
};

const cleanupRecommendations = async () => {
  const report = {
    normalizedPlaylists: await normalizePlaylistSubjects(),
    duplicateVideosRemoved: await removeDuplicateVideos(),
    corruptedMappingsRemoved: await removeCorruptedMappings(),
    playlistsSynced: await syncPlaylistMetadata(),
  };

  logger.info("Recommendation cleanup completed", report);
  return report;
};

module.exports = {
  cleanupRecommendations,
};
