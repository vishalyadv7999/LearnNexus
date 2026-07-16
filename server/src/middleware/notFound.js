const ApiError = require("../utils/apiError");

const notFound = (_req, _res, next) => {
  next(new ApiError(404, "Route not found."));
};

module.exports = notFound;
