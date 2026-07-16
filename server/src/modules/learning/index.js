module.exports = {
  controller: require("./taskController"),
  routes: require("./taskRoutes"),
  service: require("./services/studyPlanService"),
  validation: require("./taskValidation"),
};
