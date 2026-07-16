const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);

const sanitizeValue = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  return Object.entries(value).reduce((clean, [key, nestedValue]) => {
    if (blockedKeys.has(key) || key.startsWith("$") || key.includes(".")) {
      return clean;
    }

    clean[key] = sanitizeValue(nestedValue);
    return clean;
  }, {});
};

const sanitizeRequest = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.params = sanitizeValue(req.params);
  req.query = sanitizeValue(req.query);
  next();
};

module.exports = sanitizeRequest;
