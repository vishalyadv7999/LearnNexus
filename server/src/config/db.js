const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

let databaseMode = "disconnected";
let listenersRegistered = false;
let connectedLogWritten = false;
let activeConnectionAttempt = null;

const getConnectionDetails = () => ({
  database: mongoose.connection.name,
  host: mongoose.connection.host,
});

const redactDatabaseSecrets = (value) => {
  const message = String(value || "");
  const withoutKnownUri = env.mongoUri
    ? message.split(env.mongoUri).join("<MONGODB_URI>")
    : message;

  return withoutKnownUri.replace(
    /mongodb(\+srv)?:\/\/[^@\s/]+@/gi,
    "mongodb$1://<credentials>@"
  );
};

const registerConnectionLogging = () => {
  if (listenersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => {
    connectedLogWritten = true;
    logger.info("MongoDB connected successfully", getConnectionDetails());
  });

  mongoose.connection.on("disconnected", () => {
    databaseMode = "disconnected";
    logger.error("MongoDB disconnected. Permanent MongoDB storage is unavailable.");
  });

  mongoose.connection.on("reconnected", () => {
    databaseMode = "persistent";
    logger.info("MongoDB reconnected successfully", getConnectionDetails());
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", {
      message: redactDatabaseSecrets(error.message),
    });
  });

  listenersRegistered = true;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithUri = async (uri) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: env.mongoSocketTimeoutMs,
    connectTimeoutMS: env.mongoConnectTimeoutMs,
    heartbeatFrequencyMS: 10000,
    maxPoolSize: env.mongoMaxPoolSize,
    minPoolSize: env.nodeEnv === "production" ? env.mongoMinPoolSize : 0,
    retryWrites: true,
    retryReads: true,
    autoIndex: env.nodeEnv !== "production",
  });
};

const connectDatabase = async ({
  maxRetries = env.mongoConnectMaxRetries,
  retryDelayMs = env.mongoConnectRetryDelayMs,
} = {}) => {
  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);
  registerConnectionLogging();

  if (mongoose.connection.readyState === 1) {
    databaseMode = "persistent";
    return mongoose.connection;
  }

  if (activeConnectionAttempt) {
    return activeConnectionAttempt;
  }

  activeConnectionAttempt = (async () => {
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt += 1;

      try {
        await connectWithUri(env.mongoUri);
        databaseMode = "persistent";
        if (!connectedLogWritten) {
          logger.info("MongoDB connected successfully", getConnectionDetails());
        }
        return mongoose.connection;
      } catch (error) {
        databaseMode = "disconnected";
        logger.error(
          "MongoDB connection failed. Check MONGODB_URI, network access, and Atlas IP allowlist.",
          {
            attempt,
            maxRetries,
            message: redactDatabaseSecrets(error.message),
          }
        );

        if (attempt >= maxRetries) {
          throw error;
        }

        logger.warn("Retrying MongoDB connection.", {
          retryDelayMs,
        });
        await wait(retryDelayMs);
      }
    }
  })();

  try {
    return await activeConnectionAttempt;
  } finally {
    activeConnectionAttempt = null;
  }
};

const getDatabaseMode = () => databaseMode;

module.exports = {
  connectDatabase,
  getDatabaseMode,
};
