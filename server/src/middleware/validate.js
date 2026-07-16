const { validationResult } = require("express-validator");
const ApiError = require("../utils/apiError");

const validateRequest = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  next(
    new ApiError(
      422,
      "The request contains invalid data.",
      result.array().map((item) => item.msg)
    )
  );
};

module.exports = validateRequest;

