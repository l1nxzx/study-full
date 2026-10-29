import { apiClient } from "./client";
import type { ClassSession, ClassSessionDetail } from "@/types";

export interface ClassSessionInput {
  classId?: string | null;
  subjectId: string;
  date: string;
  title?: string;
}

export function listClassSessions(filters: { subjectId?: string; date?: string } = {}) {
  return apiClient.get<ClassSession[]>("/class-sessions", { params: filters }).then((r) => r.data);
}

export function getClassSession(id: string) {
  return apiClient.get<ClassSessionDetail>(`/class-sessions/${id}`).then((r) => r.data);
}

export function createClassSession(input: ClassSessionInput) {
  return apiClient.post<ClassSession>("/class-sessions", input).then((r) => r.data);
}

export function updateClassSession(id: string, input: Partial<ClassSessionInput>) {
  return apiClient.patch<ClassSession>(`/class-sessions/${id}`, input).then((r) => r.data);
}

export function deleteClassSession(id: string) {
  return apiClient.delete(`/class-sessions/${id}`);
}
