import axios from "axios";
import type { ApiError } from "@/types";

export const TOKEN_STORAGE_KEY = "study.token";

// VITE_API_URL is the backend origin (e.g. https://study-full.onrender.com). When unset,
// requests go to /api on the current origin, which Vite proxies to the local backend.
const apiOrigin = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "").replace(/\/api$/, "");

export const apiClient = axios.create({
  baseURL: `${apiOrigin}/api`,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // A disabled account is signed out everywhere, with the reason shown on the sign-in page.
    if (error.response?.data?.error?.code === "ACCOUNT_DISABLED") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = "/login?reason=disabled";
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}
