const ApiError = require("../utils/apiError");

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new ApiError(403, "Admin access is required."));
    return;
  }

  next();
};

module.exports = requireRole;
