const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const morgan = require("morgan");
const env = require("./config/env");
const {
  adminRoutes,
  authRoutes,
  internshipPrepRoutes,
  learningAssistantRoutes,
  progressRoutes,
  taskRoutes,
  userRoutes,
} = require("./modules");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const requestId = require("./middleware/requestId");
const sanitizeRequest = require("./middleware/sanitize");
const { apiLimiter } = require("./middleware/rateLimiters");
const logger = require("./utils/logger");
const { getDatabaseMode } = require("./config/db");

const app = express();

if (env.trustProxy) {
  app.set("trust proxy", 1);
}

const allowedClientOrigins = new Set([env.clientUrl].filter(Boolean));

if (env.nodeEnv !== "production") {
  allowedClientOrigins.add("http://localhost:5173");
  allowedClientOrigins.add("http://127.0.0.1:5173");
}

const isLocalDevelopmentOrigin = (origin = "") =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedClientOrigins.has(origin) ||
        (env.nodeEnv !== "production" && isLocalDevelopmentOrigin(origin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.disable("x-powered-by");
app.use(compression());
app.use(requestId);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeRequest);
app.use(
  morgan(env.nodeEnv === "production" ? "combined" : "dev", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const databaseStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: readyState === 1 ? "ok" : "degraded",
    service: "LearnNexus API",
    database: databaseStatusMap[readyState] || "unknown",
    databaseMode: readyState === 1 ? getDatabaseMode() : "unavailable",
    permanentStorage:
      readyState === 1 && getDatabaseMode() === "persistent" && !env.isLocalMongoUri(env.mongoUri),
    storageWarning: env.isLocalMongoUri(env.mongoUri)
      ? "MONGODB_URI points to localhost. Use a MongoDB Atlas mongodb+srv:// URI for permanent cloud storage."
      : undefined,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/study-plan", taskRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
if (internshipPrepRoutes) {
  app.use("/api/internship-prep", internshipPrepRoutes);
}
if (learningAssistantRoutes) {
  app.use("/api/learning-assistant", learningAssistantRoutes);
}
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/study-plan", taskRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
