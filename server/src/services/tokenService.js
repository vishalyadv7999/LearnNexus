const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");
const env = require("../config/env");
const { signAccessToken } = require("../utils/jwt");

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_COOKIE_PATH = "/api";
const LEGACY_REFRESH_COOKIE_PATH = "/api/auth";

const hashToken = (token) =>
  crypto.createHmac("sha256", env.refreshTokenSecret).update(token).digest("hex");

const hashLegacyToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getTokenHashCandidates = (token) => {
  const currentHash = hashToken(token);
  const legacyHash = hashLegacyToken(token);
  return currentHash === legacyHash ? [currentHash] : [currentHash, legacyHash];
};

const getRefreshExpiry = () =>
  new Date(Date.now() + env.jwtRefreshDays * 24 * 60 * 60 * 1000);

const createRefreshToken = async (user, req) => {
  const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = getRefreshExpiry();

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    ipAddress: req.ip,
  });

  return {
    token,
    tokenHash,
    expiresAt,
  };
};

// Refresh tokens stay in an HTTP-only cookie and are renewed with a sliding
// expiry. Keeping the same opaque token avoids tab/request races that can log
// users out when several refresh calls happen at once.
const renewRefreshToken = async (tokenDocument) => {
  tokenDocument.expiresAt = getRefreshExpiry();
  await tokenDocument.save();
  return tokenDocument;
};

const buildAuthPayload = (user) => ({
  accessToken: signAccessToken(user),
  expiresIn: env.jwtAccessExpiresIn,
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: REFRESH_COOKIE_PATH,
  expires: getRefreshExpiry(),
});

const setRefreshCookie = (res, token) => {
  clearLegacyRefreshCookie(res);
  res.cookie(env.refreshCookieName, token, getRefreshCookieOptions());
};

const clearCookieAtPath = (res, path) => {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path,
  });
};

const clearLegacyRefreshCookie = (res) => {
  clearCookieAtPath(res, LEGACY_REFRESH_COOKIE_PATH);
};

const clearRefreshCookie = (res) => {
  clearCookieAtPath(res, REFRESH_COOKIE_PATH);
  clearLegacyRefreshCookie(res);
};

module.exports = {
  buildAuthPayload,
  clearRefreshCookie,
  createRefreshToken,
  getRefreshExpiry,
  getTokenHashCandidates,
  hashToken,
  renewRefreshToken,
  setRefreshCookie,
};
