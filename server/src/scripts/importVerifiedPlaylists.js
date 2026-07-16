const mongoose = require("mongoose");
const { connectDatabase } = require("../config/db");
const { VERIFIED_PLAYLISTS } = require("../data/recommendationCatalog");
const { importPlaylist } = require("../services/youtubePlaylistImportService");
const logger = require("../utils/logger");

const run = async () => {
  await connectDatabase();
  const report = {
    fixedPlaylists: [],
    failedPlaylists: [],
  };

  for (const playlist of VERIFIED_PLAYLISTS) {
    try {
      const imported = await importPlaylist({
        ...playlist,
        continueExisting: true,
      });
      report.fixedPlaylists.push({
        youtubePlaylistId: imported.youtubePlaylistId,
        title: imported.playlistTitle,
        importedVideoCount: imported.importedVideoCount,
        skippedVideoCount: imported.skippedVideoCount,
        status: imported.importStatus,
      });
    } catch (error) {
      report.failedPlaylists.push({
        youtubePlaylistId: playlist.youtubePlaylistId,
        title: playlist.playlistTitle,
        error: error.message,
      });
      logger.error("Verified playlist import failed", {
        playlistId: playlist.youtubePlaylistId,
        error,
      });
    }
  }

  logger.info("Verified playlist import report", report);
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error("Verified playlist import script failed", { error });
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
