const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const signAccessToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role || "student",
      tokenVersion: user.passwordChangedAt
        ? Math.floor(user.passwordChangedAt.getTime() / 1000)
        : 0,
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
      issuer: "learnnexus-api",
      audience: "learnnexus-client",
      jwtid: crypto.randomUUID(),
    }
  );

const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwtAccessSecret, {
    issuer: "learnnexus-api",
    audience: "learnnexus-client",
  });

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
