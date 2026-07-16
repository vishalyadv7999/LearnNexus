import api from "./apiClient";

export const fetchProgressOverview = () => api.get("/progress/summary");

export const fetchProgressDashboard = () => api.get("/progress");

export const updateTaskProgress = (taskId, progress) =>
  api.patch(
    `/progress/${taskId}`,
    typeof progress === "boolean" ? { completed: progress } : progress
  );

export const completeStudyPlanTask = (taskId, progress = {}) =>
  api.patch(`/study-plan/task/${taskId}/complete`, progress);

export const updateVideoProgress = (videoId, progress) =>
  api.patch(`/progress/videos/${videoId}`, progress);
