module.exports = {
  controller: require("./adminRecommendationController"),
  routes: require("./adminRoutes"),
  service: require("./services/recommendationCleanupService"),
  validation: require("./adminValidation"),
};
