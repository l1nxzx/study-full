import { apiClient } from "./client";
import type { Subject, SubjectDetail } from "@/types";

export interface SubjectInput {
  name: string;
  icon?: string;
  color?: string;
}

export function listSubjects() {
  return apiClient.get<Subject[]>("/subjects").then((r) => r.data);
}

export function getSubject(id: string) {
  return apiClient.get<SubjectDetail>(`/subjects/${id}`).then((r) => r.data);
}

export function createSubject(input: SubjectInput) {
  return apiClient.post<Subject>("/subjects", input).then((r) => r.data);
}

export function updateSubject(id: string, input: Partial<SubjectInput>) {
  return apiClient.patch<Subject>(`/subjects/${id}`, input).then((r) => r.data);
}

export function deleteSubject(id: string) {
  return apiClient.delete(`/subjects/${id}`);
}
