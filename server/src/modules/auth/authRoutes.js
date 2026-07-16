const express = require("express");
const {
  register,
  verifyRegistration,
  resendVerification,
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  listCourses,
  listChannels,
} = require("./authController");
const requireDatabase = require("../../middleware/requireDatabase");
const {
  authLimiter,
  passwordResetLimiter,
  verificationEmailLimiter,
} = require("../../middleware/rateLimiters");
const validateRequest = require("../../middleware/validate");
const {
  registerValidation,
  loginValidation,
  verificationValidation,
  resendVerificationValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("./authValidation");

const router = express.Router();

router.get("/courses", listCourses);
router.get("/channels", listChannels);
router.post(
  "/register",
  requireDatabase,
  authLimiter,
  registerValidation,
  validateRequest,
  register
);
router.post(
  "/verify",
  requireDatabase,
  authLimiter,
  verificationValidation,
  validateRequest,
  verifyRegistration
);
router.post(
  "/resend-verification",
  requireDatabase,
  verificationEmailLimiter,
  authLimiter,
  resendVerificationValidation,
  validateRequest,
  resendVerification
);
router.post("/login", requireDatabase, authLimiter, loginValidation, validateRequest, login);
router.post("/refresh", requireDatabase, refreshSession);
router.post("/logout", logout);
router.post(
  "/forgot-password",
  requireDatabase,
  passwordResetLimiter,
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);
router.post(
  "/reset-password",
  requireDatabase,
  passwordResetLimiter,
  resetPasswordValidation,
  validateRequest,
  resetPassword
);

module.exports = router;
