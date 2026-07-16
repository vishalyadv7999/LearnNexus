const loadOptionalModule = (modulePath) => {
  try {
    require.resolve(modulePath);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      return null;
    }
    throw error;
  }

  return require(modulePath);
};

module.exports = {
  adminRoutes: require("./admin/adminRoutes"),
  authRoutes: require("./auth/authRoutes"),
  internshipPrepRoutes: loadOptionalModule("./internshipPrep/internshipPrep.routes"),
  learningAssistantRoutes: loadOptionalModule("./learningAssistant/learningAssistant.routes"),
  progressRoutes: require("./progress/progressRoutes"),
  taskRoutes: require("./learning/taskRoutes"),
  userRoutes: require("./users/userRoutes"),
};
