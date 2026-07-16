const ApiError = require("../utils/apiError");
const env = require("../config/env");
const logger = require("../utils/logger");

const errorHandler = (error, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    res.status(400).json({
      message: "Request body must contain valid JSON.",
      requestId: req.id,
    });
    return;
  }

  if (error.message === "Not allowed by CORS") {
    res.status(403).json({
      message: "This origin is not allowed to access the API.",
      requestId: req.id,
    });
    return;
  }

  if (error.name === "ValidationError") {
    res.status(400).json({
      message: "Validation failed.",
      details: Object.values(error.errors).map((item) => item.message),
      requestId: req.id,
    });
    return;
  }

  if (error.name === "CastError") {
    res.status(400).json({
      message: "Invalid resource identifier.",
      requestId: req.id,
    });
    return;
  }

  if (error.code === 11000) {
    res.status(409).json({
      message: "A record with this value already exists.",
      details: Object.keys(error.keyPattern || error.keyValue || {}),
      requestId: req.id,
    });
    return;
  }

  if (
    error.name === "MongooseServerSelectionError" ||
    error.name === "MongoNetworkError"
  ) {
    res.status(503).json({
      message:
        "Permanent MongoDB storage is currently unavailable. Please try again shortly.",
      requestId: req.id,
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
      requestId: req.id,
    });
    return;
  }

  logger.error("Unhandled request error", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    error,
  });
  res.status(500).json({
    message: "Something went wrong on the server.",
    requestId: req.id,
    details: env.nodeEnv === "production" ? undefined : error.message,
  });
};

module.exports = errorHandler;
