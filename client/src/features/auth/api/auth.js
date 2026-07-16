import api from "../../../services/apiClient";

export const loginRequest = (payload) => api.post("/auth/login", payload);

export const registerRequest = (payload) => api.post("/auth/register", payload);

export const verifyRegistrationRequest = (payload) =>
  api.post("/auth/verify", payload);

export const resendVerificationRequest = (payload) =>
  api.post("/auth/resend-verification", payload);

export const logoutRequest = () => api.post("/auth/logout");

export const refreshSessionRequest = () => api.post("/auth/refresh");

export const forgotPasswordRequest = (payload) =>
  api.post("/auth/forgot-password", payload);

export const resetPasswordRequest = (payload) =>
  api.post("/auth/reset-password", payload);

export const fetchCurrentUser = () => api.get("/users/me");

export const fetchCourses = () => api.get("/auth/courses");

export const fetchChannels = (language, course) =>
  api.get("/auth/channels", {
    params: {
      ...(language ? { language } : {}),
      ...(course ? { course } : {}),
    },
  });

export const updatePreferences = (payload) =>
  api.patch("/users/me/preferences", payload);
