import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import toast from "react-hot-toast";

const GET_CACHE_TTL_MS = 30_000;
const getCache = new Map<string, { response: AxiosResponse<unknown>; expiresAt: number }>();

const getCacheKey = (url: string, config: AxiosRequestConfig) => {
  const token = localStorage.getItem("token") || "public";
  return `${token}:${url}:${JSON.stringify(config.params || {})}`;
};

export const clearGetCache = () => getCache.clear();

export const cachedGet = async (
  url: string,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse> => {
  const key = getCacheKey(url, config);
  const cached = getCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response as AxiosResponse;
  }

  const response = await axiosInstance.get(url, config);
  getCache.set(key, { response: response as AxiosResponse<unknown>, expiresAt: Date.now() + GET_CACHE_TTL_MS });
  return response;
};

const API_BASE_URL = (import.meta.env.VITE_BASE_URL as string | undefined) || window.location.origin;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const isLoginRequest = config.url?.includes("/auth/login");

    // Do NOT attach token for auth routes
    if (token && !isLoginRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// RESPONSE INTERCEPTOR
axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() !== "get") clearGetCache();
    return response;
  },
  (error) => {
    if (!error.response) {
      const networkError = new Error(
        "Unable to connect to backend. Please make sure the API server is running.",
      );

      // Login displays this error in its form flow; avoid a duplicate toast.
      if (error.config?.url?.includes("/auth/login")) {
        return Promise.reject(networkError);
      }

      toast.error(networkError.message);
      return Promise.reject(networkError);
    }

    const { status, config } = error.response;

    // If login API fails → don't redirect
    if (config.url?.includes("/auth/login")) {
      return Promise.reject(new Error(getApiErrorMessage(
        error.response?.data?.error?.message ||
          error.response?.data?.detail ||
          error.response?.data?.message,
        "Login failed",
      )));
    }

    // Unauthorized (only if token exists)
    if (status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      toast.error("Session expired. Please login again.");

      setTimeout(() => {
        window.location.href = "/signin";
      }, 1000);
    }

    if (status === 403) {
      toast.error("You are not authorized.");
    }

    if (status >= 500 && !error.response?.data?.error?.message && !error.response?.data?.message) {
      toast.error("Server error. Please try again later.");
    }

    return Promise.reject(new Error(getApiErrorMessage(
      error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        error.response?.data?.message,
      error.message,
    )));
  },
);

export default axiosInstance;
