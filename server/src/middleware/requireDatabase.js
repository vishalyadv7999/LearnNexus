const mongoose = require("mongoose");
const ApiError = require("../utils/apiError");

const requireDatabase = (_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    next(
      new ApiError(
        503,
        "Permanent MongoDB storage is unavailable. Check MONGODB_URI, MongoDB Atlas network access, and IP allowlist."
      )
    );
    return;
  }

  next();
};

module.exports = requireDatabase;
