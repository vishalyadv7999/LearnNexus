const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message,
    },
  });

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: "Too many requests. Please slow down and try again shortly.",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "Too many authentication attempts. Please wait and try again.",
});

const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many recovery requests. Please wait before trying again.",
});

const verificationEmailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many verification email requests. Please wait before trying again.",
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  verificationEmailLimiter,
};
