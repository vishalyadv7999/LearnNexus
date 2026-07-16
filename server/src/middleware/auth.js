const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { verifyAccessToken } = require("../utils/jwt");

const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new ApiError(401, "Authentication token is required.");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new ApiError(401, "The token is no longer valid.");
    }

    const passwordVersion = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : 0;

    if (payload.tokenVersion !== passwordVersion) {
      throw new ApiError(401, "Your session has expired. Please log in again.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(new ApiError(401, "Your session has expired. Please log in again."));
      return;
    }

    next(error);
  }
};

module.exports = authenticate;
