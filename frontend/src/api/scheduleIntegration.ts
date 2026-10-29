import { apiClient } from "./client";

export interface ScheduleIntegrationStatus {
  connected: boolean;
  sourceHost: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: "ok" | "error" | null;
  lastSyncError: string | null;
}

export function getStatus() {
  return apiClient.get<ScheduleIntegrationStatus>("/schedule-integration/status").then((r) => r.data);
}

export function connect(icsUrl: string) {
  return apiClient.post("/schedule-integration/connect", { icsUrl });
}

export function syncNow() {
  return apiClient.post("/schedule-integration/sync");
}

export function disconnect() {
  return apiClient.delete("/schedule-integration");
}
