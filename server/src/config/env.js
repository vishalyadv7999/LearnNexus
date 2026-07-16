const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const readEnv = (name) => {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
};

const readFirstEnv = (...names) => {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  return "";
};

const normalizeEmailPassword = (value) => value.replace(/\s+/g, "");

const hasMongoConnectionString = (value) =>
  /^mongodb(\+srv)?:\/\//i.test(value || "");

const isLocalMongoUri = (value = "") =>
  /(^|[/:@])(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(value);

const emailUser = readFirstEnv("EMAIL_USER", "SMTP_USER");
const emailPass = normalizeEmailPassword(readFirstEnv("EMAIL_PASS", "SMTP_PASS"));
const emailFrom =
  readFirstEnv("EMAIL_FROM", "MAIL_FROM") ||
  (emailUser ? `LearnNexus <${emailUser}>` : "LearnNexus <no-reply@learnnexus.app>");

const env = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: readEnv("MONGODB_URI"),
  mongoMaxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
  mongoMinPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 2,
  mongoServerSelectionTimeoutMs:
    Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
  mongoSocketTimeoutMs: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
  mongoConnectTimeoutMs: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
  mongoConnectRetryDelayMs:
    Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS) || 5000,
  mongoConnectMaxRetries:
    process.env.MONGO_CONNECT_MAX_RETRIES === undefined
      ? 3
      : Number(process.env.MONGO_CONNECT_MAX_RETRIES),
  jwtSecret: readEnv("JWT_SECRET"),
  jwtAccessSecret: readEnv("JWT_ACCESS_SECRET") || readEnv("JWT_SECRET"),
  refreshTokenSecret: readEnv("REFRESH_TOKEN_SECRET") || readEnv("JWT_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshDays: Number(process.env.JWT_REFRESH_DAYS) || 30,
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "learnnexus_refresh",
  cookieSameSite: String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase(),
  cookieSecure:
    process.env.COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === "production"
      : process.env.COOKIE_SECURE === "true",
  clientUrl: readFirstEnv("CLIENT_URL", "FRONTEND_URL"),
  serverUrl:
    readFirstEnv("SERVER_URL", "BACKEND_URL") ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5001"),
  smtpHost: readEnv("SMTP_HOST"),
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: emailUser,
  smtpPass: emailPass,
  mailFrom: emailFrom,
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  trustProxy: process.env.TRUST_PROXY === "true",
  redisUrl: process.env.REDIS_URL || "",
  youtubeApiKey: process.env.YOUTUBE_API_KEY || "",
  autoResumePlaylistImports: process.env.AUTO_RESUME_PLAYLIST_IMPORTS === "true",
  aiProvider: (readEnv("AI_PROVIDER") || "openai").toLowerCase(),
  openAiApiKey: readEnv("OPENAI_API_KEY"),
  openAiModel: readEnv("OPENAI_MODEL") || "gpt-4.1-mini",
  geminiApiKey: readEnv("GEMINI_API_KEY"),
  geminiModel: readEnv("GEMINI_MODEL") || "gemini-1.5-flash",
  learningAssistantTimeoutMs:
    Number(process.env.LEARNING_ASSISTANT_TIMEOUT_MS) || 30000,
  learningAssistantMaxRetries:
    Number(process.env.LEARNING_ASSISTANT_MAX_RETRIES) || 1,
};

const getEnvWarnings = () => {
  const warnings = [];

  if (env.mongoUri && isLocalMongoUri(env.mongoUri)) {
    warnings.push(
      "MONGODB_URI points to localhost. This is not MongoDB Atlas permanent cloud storage; use a mongodb+srv:// Atlas URI to keep data across machines/deployments."
    );
  }

  if (!Number.isFinite(env.mongoConnectMaxRetries) || env.mongoConnectMaxRetries < 0) {
    warnings.push(
      "MONGO_CONNECT_MAX_RETRIES is invalid. Use a positive integer."
    );
  }

  if (env.nodeEnv === "production" && !env.youtubeApiKey) {
    warnings.push(
      "YOUTUBE_API_KEY is not configured. LearnNexus will use curated playlists and public YouTube fallbacks; playlist auto-imports must remain disabled."
    );
  }

  return warnings;
};

const validateEnv = () => {
  const errors = [];

  if (!env.mongoUri) {
    errors.push("MONGODB_URI is missing. Add MongoDB Atlas connection string in .env");
  } else if (!hasMongoConnectionString(env.mongoUri)) {
    errors.push("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
  } else if (env.nodeEnv !== "test" && isLocalMongoUri(env.mongoUri)) {
    errors.push(
      "MONGODB_URI points to localhost. Add a MongoDB Atlas mongodb+srv:// connection string in .env for permanent storage."
    );
  }

  if (!env.jwtSecret) {
    errors.push("JWT_SECRET is required.");
  }

  if (!env.clientUrl) {
    errors.push("CLIENT_URL is required.");
  } else {
    try {
      new URL(env.clientUrl);
    } catch (_error) {
      errors.push("CLIENT_URL must be a valid URL.");
    }
  }

  if (env.serverUrl) {
    try {
      new URL(env.serverUrl);
    } catch (_error) {
      errors.push("SERVER_URL must be a valid URL when provided.");
    }
  }

  if (env.nodeEnv !== "test") {
    if (!env.smtpHost) {
      errors.push("SMTP_HOST is required for verification and password reset emails.");
    }

    if (!env.smtpUser) {
      errors.push("EMAIL_USER is required for SMTP delivery. Add it to server/.env.");
    }

    if (!env.smtpPass) {
      errors.push("EMAIL_PASS is required. Use a Gmail 16-character App Password, not your normal Gmail password.");
    }

    if (!env.mailFrom) {
      errors.push("EMAIL_FROM is required.");
    }

    if (env.autoResumePlaylistImports && !env.youtubeApiKey) {
      errors.push(
        "YOUTUBE_API_KEY is required when AUTO_RESUME_PLAYLIST_IMPORTS is true."
      );
    }
  }

  if (env.nodeEnv === "production") {
    if (env.jwtSecret.length < 32 || /replace|change|secret/i.test(env.jwtSecret)) {
      errors.push("JWT_SECRET must be a strong production secret with at least 32 characters.");
    }

    if (
      env.jwtAccessSecret &&
      (env.jwtAccessSecret.length < 32 || /replace|change|secret/i.test(env.jwtAccessSecret))
    ) {
      errors.push("JWT_ACCESS_SECRET must be a strong production secret with at least 32 characters.");
    }

    if (
      env.refreshTokenSecret &&
      (env.refreshTokenSecret.length < 32 || /replace|change|secret/i.test(env.refreshTokenSecret))
    ) {
      errors.push("REFRESH_TOKEN_SECRET must be a strong production secret with at least 32 characters.");
    }

    if (!env.cookieSecure) {
      errors.push("COOKIE_SECURE must be true in production.");
    }

    if (env.clientUrl && !env.clientUrl.startsWith("https://")) {
      errors.push("CLIENT_URL must use HTTPS in production.");
    }

    if (env.serverUrl && !env.serverUrl.startsWith("https://")) {
      errors.push("SERVER_URL must use HTTPS in production.");
    }

  }

  if (!Number.isInteger(env.port) || env.port <= 0) {
    errors.push("PORT must be a positive integer.");
  }

  if (!Number.isInteger(env.jwtRefreshDays) || env.jwtRefreshDays < 1) {
    errors.push("JWT_REFRESH_DAYS must be at least 1.");
  }

  if (
    !Number.isFinite(env.mongoConnectMaxRetries) ||
    env.mongoConnectMaxRetries < 1
  ) {
    errors.push("MONGO_CONNECT_MAX_RETRIES must be a positive integer.");
  }

  if (
    !Number.isFinite(env.mongoConnectRetryDelayMs) ||
    env.mongoConnectRetryDelayMs < 1000
  ) {
    errors.push("MONGO_CONNECT_RETRY_DELAY_MS must be at least 1000.");
  }

  if (!["strict", "lax", "none"].includes(String(env.cookieSameSite).toLowerCase())) {
    errors.push("COOKIE_SAME_SITE must be strict, lax, or none.");
  }

  if (env.cookieSameSite === "none" && !env.cookieSecure) {
    errors.push("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }
};

module.exports = {
  ...env,
  getEnvWarnings,
  isLocalMongoUri,
  validateEnv,
};
