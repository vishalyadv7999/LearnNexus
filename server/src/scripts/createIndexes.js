const { connectDatabase } = require("../config/db");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

require("../models/User");
require("../models/RefreshToken");
require("../models/StudyPlan");
require("../models/Task");
require("../models/Progress");
require("../models/Channel");
require("../models/Playlist");
require("../models/Video");
require("../models/LearningState");

const run = async () => {
  await connectDatabase();
  await Promise.all(
    mongoose.modelNames().map(async (modelName) => {
      logger.info(`Syncing indexes for ${modelName}`);
      await mongoose.model(modelName).syncIndexes();
    })
  );
  logger.info("Database indexes synced.");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error("Index sync failed", { error });
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
