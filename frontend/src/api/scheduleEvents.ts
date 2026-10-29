import { apiClient } from "./client";
import type { ScheduleEvent } from "@/types";

export function listScheduleEvents(from: string, to: string) {
  return apiClient.get<ScheduleEvent[]>("/schedule-events", { params: { from, to } }).then((r) => r.data);
}
