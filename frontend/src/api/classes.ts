import { apiClient } from "./client";
import type { ClassEntity, Weekday } from "@/types";

export interface ClassInput {
  subjectId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
}

export function listClasses() {
  return apiClient.get<ClassEntity[]>("/classes").then((r) => r.data);
}

export function createClass(input: ClassInput) {
  return apiClient.post<ClassEntity>("/classes", input).then((r) => r.data);
}

export function updateClass(id: string, input: Partial<ClassInput>) {
  return apiClient.patch<ClassEntity>(`/classes/${id}`, input).then((r) => r.data);
}

export function deleteClass(id: string) {
  return apiClient.delete(`/classes/${id}`);
}
