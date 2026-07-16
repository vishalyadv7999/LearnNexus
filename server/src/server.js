const mongoose = require("mongoose");
const { connectDatabase } = require("./config/db");
const env = require("./config/env");
const { verifyEmailTransport } = require("./services/emailService");
const logger = require("./utils/logger");

const redactSecrets = (value) => {
  const message = String(value || "");
  const withoutMongoUri = env.mongoUri
    ? message.split(env.mongoUri).join("<MONGODB_URI>")
    : message;

  return withoutMongoUri.replace(
    /mongodb(\+srv)?:\/\/[^@\s/]+@/gi,
    "mongodb$1://<credentials>@"
  );
};

const toSafeErrorLog = (error) => {
  if (!error || typeof error !== "object") {
    return { message: redactSecrets(error) };
  }

  return {
    name: error.name,
    message: redactSecrets(error.message),
    code: error.code,
  };
};

const logProcessError = (label, error) => {
  logger.error(label, { error: toSafeErrorLog(error) });
};

let server = null;
let isShuttingDown = false;

const closeServer = async () => {
  if (!server) {
    return;
  }

  await new Promise((resolve) => {
    server.close(() => resolve());
  });
};

const closeDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

const initiateShutdown = async ({ code = 0, error, label, signal } = {}) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (label) {
    logProcessError(label, error);
  } else if (signal) {
    logger.info(`${signal} received. Shutting down LearnNexus API.`);
  }

  try {
    await closeServer();
    await closeDatabase();
  } catch (shutdownError) {
    logProcessError("Graceful shutdown failed", shutdownError);
    code = 1;
  } finally {
    process.exit(code);
  }
};

process.on("uncaughtException", (error) => {
  initiateShutdown({
    code: 1,
    error,
    label: "Uncaught exception",
  }).catch(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (reason) => {
  initiateShutdown({
    code: 1,
    error: reason,
    label: "Unhandled promise rejection",
  }).catch(() => {
    process.exit(1);
  });
});

const startServer = async () => {
  env.validateEnv();
  env.getEnvWarnings().forEach((message) => {
    logger.warn(message);
  });

  await connectDatabase();
  await verifyEmailTransport();

  const app = require("./app");
  const {
    resumePendingPlaylistImports,
  } = require("./modules/videos/services/youtubePlaylistImportService");
  const {
    syncCuratedPlaylistMappings,
  } = require("./modules/videos/services/curatedPlaylistSyncService");

  if (mongoose.connection.readyState === 1) {
    await syncCuratedPlaylistMappings();
  }

  server = app.listen(env.port, () => {
    logger.info(`LearnNexus API running on port ${env.port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logger.error(
        `Port ${env.port} is already in use. Another LearnNexus API process is already running or a stale Node process is still bound to this port.`
      );
      logger.error(
        `Use the existing API at http://localhost:${env.port}/api/health, or stop the process using port ${env.port} before starting nodemon again.`
      );
      process.exit(0);
      return;
    }

    logProcessError("HTTP server startup error", error);
    process.exit(1);
  });

  if (env.autoResumePlaylistImports && mongoose.connection.readyState === 1) {
    resumePendingPlaylistImports()
      .then((results) => {
        logger.info("Playlist import auto-resume finished", { results });
      })
      .catch((error) => {
        logger.error("Playlist import auto-resume failed", {
          error: toSafeErrorLog(error),
        });
      });
  }
};

process.on("SIGINT", () => {
  initiateShutdown({ code: 0, signal: "SIGINT" }).catch((error) => {
    logProcessError("Graceful shutdown failed", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  initiateShutdown({ code: 0, signal: "SIGTERM" }).catch((error) => {
    logProcessError("Graceful shutdown failed", error);
    process.exit(1);
  });
});

startServer().catch((error) => {
  logProcessError("Server startup failed", error);
  process.exit(1);
});
