import { apiClient } from "./client";

export function getHealth() {
  return apiClient.get<{ status: string; aiEnabled: boolean }>("/health").then((r) => r.data);
}
