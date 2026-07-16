import axios from "axios";
import { clearToken, getToken, setToken } from "../utils/token";

const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:5001/api" : "/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || fallbackApiUrl,
  withCredentials: true,
  timeout: 20000,
});

let refreshPromise = null;
let hasDispatchedAuthExpired = false;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const notifyAuthExpired = (message = "Session expired, please login again.") => {
  if (hasDispatchedAuthExpired) {
    return;
  }

  hasDispatchedAuthExpired = true;
  window.dispatchEvent(
    new CustomEvent("learnnexus:auth-expired", {
      detail: { message },
    })
  );
};

const isTransientFailure = (error) =>
  !error.response || [502, 503, 504].includes(error.response.status);

const isSafeRetryRequest = (config = {}) =>
  String(config.method || "get").toLowerCase() === "get";

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.accessToken || response.data?.token) {
      hasDispatchedAuthExpired = false;
    }

    return response;
  },
  async (error) => {
    if (
      error.config &&
      isSafeRetryRequest(error.config) &&
      isTransientFailure(error) &&
      !error.config?._retryAfterTransientFailure
    ) {
      error.config._retryAfterTransientFailure = true;
      await wait(500);
      return api(error.config);
    }

    const requestUrl = error.config?.url || "";
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/verify") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password");

    if (error.response?.status === 401 && !isAuthRoute && !error.config?._retry) {
      error.config._retry = true;

      try {
        refreshPromise =
          refreshPromise || api.post("/auth/refresh").finally(() => {
            refreshPromise = null;
          });

        const { data } = await refreshPromise;
        setToken(data.accessToken || data.token);
        error.config.headers = error.config.headers || {};
        error.config.headers.Authorization = `Bearer ${data.accessToken || data.token}`;
        return api(error.config);
      } catch (refreshError) {
        clearToken();
        notifyAuthExpired(refreshError.response?.data?.message);
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isAuthRoute) {
      clearToken();
      notifyAuthExpired(error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

export default api;
