const User = require("../../models/User");
const RefreshToken = require("../../models/RefreshToken");
const ApiError = require("../../utils/apiError");
const {
  getAvailableCourses,
  getCourseSubjectOptions,
} = require("../../services/curriculumService");
const {
  getAllSubjects,
  getChannelsByLanguage,
  getLearningCatalog,
  getSubjectLabel,
  normalizeKey,
  resolveBranchTag,
} = require("../../data/recommendationCatalog");
const { getMappedCreatorsForCourse } = require("../../data/curatedLearningCatalog");
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require("../../services/emailService");
const {
  buildAuthPayload,
  clearRefreshCookie,
  createRefreshToken,
  getTokenHashCandidates,
  renewRefreshToken,
  setRefreshCookie,
} = require("../../services/tokenService");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const crypto = require("crypto");

const VERIFICATION_CODE_TTL_MINUTES = 30;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_LOCK_MINUTES = 15;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  course: user.course,
  year: user.year,
  role: user.role || "student",
  isAdmin: user.role === "admin",
  emailVerified: user.emailVerified !== false,
  currentStreak: user.currentStreak,
  preferences: user.preferences,
  createdAt: user.createdAt,
});

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashVerificationCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const hashPasswordResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createVerificationCode = () =>
  String(crypto.randomInt(100000, 1000000));

const createPasswordResetToken = () => crypto.randomBytes(32).toString("base64url");

// Reset links carry only the raw one-time token; MongoDB stores the hash so a
// leaked database record cannot be used to reset a password.
const buildPasswordResetUrl = ({ email, token }) => {
  const url = new URL("/reset-password", env.clientUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
};

const setVerificationCode = (user, code) => {
  user.emailVerificationCodeHash = hashVerificationCode(code);
  user.emailVerificationExpiresAt = new Date(
    Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000
  );
};

const sendCodeForUser = async (user) => {
  const code = createVerificationCode();
  setVerificationCode(user, code);
  await user.save();
  const delivery = await sendVerificationEmail({
    to: user.email,
    name: user.name,
    code,
  });

  return {
    ...delivery,
    devVerificationCode:
      env.nodeEnv !== "production" && delivery.mode !== "smtp" ? code : undefined,
  };
};

const issueSession = async ({ user, req, res, message }) => {
  const refreshToken = await createRefreshToken(user, req);
  setRefreshCookie(res, refreshToken.token);
  const authPayload = buildAuthPayload(user);

  res.json({
    message,
    ...authPayload,
    token: authPayload.accessToken,
    user: sanitizeUser(user),
  });
};

const isAccountLocked = (user) => user.lockUntil && user.lockUntil > new Date();

const markLoginFailure = async (user) => {
  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
  }

  await user.save();
};

const logAuthFailure = (req, reason, email) => {
  logger.warn("Authentication failure", {
    reason,
    email: email ? normalizeEmail(email) : undefined,
    ip: req.ip,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    requestId: req.id,
  });
};

const clearLoginFailures = async (user) => {
  if (user.loginAttempts || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, course, year } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail }).select(
      "+password +emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (existingUser) {
      throw new ApiError(
        409,
        existingUser.emailVerified === false
          ? "An account already exists for this email. Please confirm your email or log in."
          : "An account already exists for this email. Please log in instead."
      );
    }

    const user = new User({
      name,
      email: normalizedEmail,
      password,
      course,
      year,
      emailVerified: false,
    });

    const delivery = await sendCodeForUser(user);

    res.status(201).json({
      message:
        delivery.mode === "smtp"
          ? "Verification code sent. Check your email to finish signup."
          : "Verification code generated. Check the backend terminal to finish signup.",
      requiresVerification: true,
      email: user.email,
      deliveryMode: delivery.mode,
      devVerificationCode: delivery.devVerificationCode,
    });
  } catch (error) {
    next(error);
  }
};

const verifyRegistration = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (!user) {
      throw new ApiError(404, "No pending account was found for this email.");
    }

    if (user.emailVerified !== false) {
      throw new ApiError(409, "This account is already verified. Please log in.");
    }

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new ApiError(400, "Verification code expired. Please request a new code.");
    }

    if (hashVerificationCode(code) !== user.emailVerificationCodeHash) {
      throw new ApiError(400, "Incorrect verification code.");
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    await issueSession({
      user,
      req,
      res,
      message: "Account verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (!user) {
      throw new ApiError(404, "No pending account was found for this email.");
    }

    if (user.emailVerified !== false) {
      throw new ApiError(409, "This account is already verified. Please log in.");
    }

    const delivery = await sendCodeForUser(user);

    res.json({
      message:
        delivery.mode === "smtp"
          ? "A new verification code was sent to your email."
          : "A new verification code was generated. Check the backend terminal.",
      deliveryMode: delivery.mode,
      devVerificationCode: delivery.devVerificationCode,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+password +loginAttempts +lockUntil"
    );

    if (!user) {
      logAuthFailure(req, "user_not_found", email);
      throw new ApiError(401, "Incorrect email or password.");
    }

    if (isAccountLocked(user)) {
      logAuthFailure(req, "account_locked", email);
      throw new ApiError(
        423,
        "Too many failed login attempts. Please wait before trying again."
      );
    }

    if (!(await user.comparePassword(password))) {
      await markLoginFailure(user);
      logAuthFailure(req, "bad_password", email);
      throw new ApiError(401, "Incorrect email or password.");
    }

    if (user.emailVerified === false) {
      logAuthFailure(req, "email_not_verified", email);
      throw new ApiError(
        403,
        "Please verify your email before logging in. Use the code sent during signup."
      );
    }

    await clearLoginFailures(user);
    await issueSession({
      user,
      req,
      res,
      message: "Login successful.",
    });
  } catch (error) {
    next(error);
  }
};

const refreshSession = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[env.refreshCookieName];

    if (!rawRefreshToken) {
      throw new ApiError(401, "Refresh session is required.");
    }

    const tokenDocument = await RefreshToken.findOne({
      tokenHash: { $in: getTokenHashCandidates(rawRefreshToken) },
    }).populate("user");

    if (!tokenDocument || tokenDocument.expiresAt <= new Date()) {
      clearRefreshCookie(res);
      throw new ApiError(401, "Session expired, please login again.");
    }

    const user = tokenDocument.user;

    if (tokenDocument.revokedAt) {
      clearRefreshCookie(res);
      throw new ApiError(401, "Session expired, please login again.");
    }

    if (!user || user.emailVerified === false) {
      clearRefreshCookie(res);
      throw new ApiError(401, "Session expired, please login again.");
    }

    await renewRefreshToken(tokenDocument);
    setRefreshCookie(res, rawRefreshToken);
    const authPayload = buildAuthPayload(user);

    res.json({
      message: "Session refreshed.",
      ...authPayload,
      token: authPayload.accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[env.refreshCookieName];

    if (rawRefreshToken) {
      try {
        await RefreshToken.updateOne(
          {
            tokenHash: { $in: getTokenHashCandidates(rawRefreshToken) },
            revokedAt: { $exists: false },
          },
          { $set: { revokedAt: new Date() } }
        );
      } catch (error) {
        logger.warn("Refresh token revocation failed during logout.", {
          message: error.message,
          requestId: req.id,
        });
      }
    }

    clearRefreshCookie(res);
    res.json({
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+passwordResetTokenHash +passwordResetCodeHash +passwordResetExpiresAt"
    );

    if (user) {
      const token = createPasswordResetToken();
      const resetUrl = buildPasswordResetUrl({ email: user.email, token });
      user.passwordResetTokenHash = hashPasswordResetToken(token);
      user.passwordResetCodeHash = undefined;
      user.passwordResetExpiresAt = new Date(
        Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000
      );
      await user.save();

      const delivery = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      res.json({
        message: "If an account exists, a password reset link has been sent.",
        deliveryMode: delivery.mode,
        devResetToken:
          env.nodeEnv !== "production" && delivery.mode !== "smtp" ? token : undefined,
        devResetUrl:
          env.nodeEnv !== "production" && delivery.mode !== "smtp" ? resetUrl : undefined,
      });
      return;
    }

    res.json({
      message: "If an account exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, code, password } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+password +passwordResetTokenHash +passwordResetCodeHash +passwordResetExpiresAt +loginAttempts +lockUntil"
    );
    const resetToken = token || code;
    const resetTokenMatches =
      user?.passwordResetTokenHash &&
      resetToken &&
      hashPasswordResetToken(resetToken) === user.passwordResetTokenHash;
    const legacyCodeMatches =
      user?.passwordResetCodeHash &&
      code &&
      hashVerificationCode(code) === user.passwordResetCodeHash;

    if (
      !user ||
      (!user.passwordResetTokenHash && !user.passwordResetCodeHash) ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date() ||
      (!resetTokenMatches && !legacyCodeMatches)
    ) {
      throw new ApiError(400, "Password reset link is invalid or expired.");
    }

    user.password = password;
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.emailVerified = true;
    await user.save();

    await RefreshToken.deleteMany({ user: user._id });
    clearRefreshCookie(res);

    res.json({
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

const listCourses = (_req, res) => {
  res.json({
    courses: getAvailableCourses(),
  });
};

const listChannels = (req, res) => {
  const language = req.query.language || "English";
  const course = req.query.course;
  const courseSubjects = course ? getCourseSubjectOptions(course, 1) : getAllSubjects();
  const courseSubjectIds = new Set(courseSubjects.map((subject) => subject.id));
  const courseBranch = course ? resolveBranchTag(course) : "";
  const mappedCreatorRank = new Map(
    getMappedCreatorsForCourse(course, language).map((creator, index) => [
      normalizeKey(creator),
      index,
    ])
  );
  const getCreatorRank = (creatorName) =>
    mappedCreatorRank.has(normalizeKey(creatorName))
      ? mappedCreatorRank.get(normalizeKey(creatorName))
      : Number.MAX_SAFE_INTEGER;
  const channels = getChannelsByLanguage(language)
    .map((channel) => ({
      id: channel.id,
      youtubeChannelId: channel.youtubeChannelId,
      name: channel.name,
      language,
      subjects: channel.subjects,
      subjectOptions: channel.subjects.map((subjectId) => ({
        id: subjectId,
        name: getSubjectLabel(subjectId),
      })).filter((subject) => courseSubjectIds.has(subject.id)),
      semesters: channel.semesters,
      branches: channel.branches,
      verified: channel.verified,
    }))
    .filter(
      (channel) =>
        !course ||
        (channel.subjectOptions.length > 0 && channel.branches.includes(courseBranch))
    )
    .sort(
      (left, right) =>
        getCreatorRank(left.name) - getCreatorRank(right.name) ||
        left.name.localeCompare(right.name)
    );
  const subjectLookup = new Map(courseSubjects.map((subject) => [subject.id, subject]));

  channels.forEach((channel) => {
    channel.subjects.forEach((subjectId) => {
      if (!subjectLookup.has(subjectId)) {
        subjectLookup.set(subjectId, {
          id: subjectId,
          name: getSubjectLabel(subjectId),
        });
      }
    });
  });

  res.json({
    channels,
    subjects: Array.from(subjectLookup.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    catalog: getLearningCatalog(language),
  });
};

module.exports = {
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
};
