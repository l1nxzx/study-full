import { apiClient } from "./client";
import type { Preferences, User } from "@/types";

interface AuthResponse {
  token: string;
  user: User;
}

export function login(email: string, password: string) {
  return apiClient.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data);
}

export function register(email: string, password: string, referralCode: string) {
  return apiClient.post<AuthResponse>("/auth/register", { email, password, referralCode }).then((r) => r.data);
}

export function getMe() {
  return apiClient.get<User>("/auth/me").then((r) => r.data);
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiClient.post("/auth/change-password", { currentPassword, newPassword });
}

export function updateProfile(name: string | null) {
  return apiClient.patch<User>("/auth/me", { name: name ?? "" }).then((r) => r.data);
}

export function updatePreferences(preferences: Preferences) {
  return apiClient.patch<User>("/auth/me", { preferences }).then((r) => r.data);
}
