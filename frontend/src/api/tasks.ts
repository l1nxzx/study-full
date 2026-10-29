import { apiClient } from "./client";
import type { ExamKind, Task, TaskType } from "@/types";

export interface TaskInput {
  title: string;
  type?: TaskType;
  examKind?: ExamKind | null;
  description?: string | null;
  subjectId?: string | null;
  sessionId?: string | null;
  dueDate?: string | null;
}

export function listTasks(filters: { subjectId?: string; sessionId?: string } = {}) {
  return apiClient.get<Task[]>("/tasks", { params: filters }).then((r) => r.data);
}

export function createTask(input: TaskInput) {
  return apiClient.post<Task>("/tasks", input).then((r) => r.data);
}

export function updateTask(id: string, input: Partial<TaskInput> & { completed?: boolean }) {
  return apiClient.patch<Task>(`/tasks/${id}`, input).then((r) => r.data);
}

export function deleteTask(id: string) {
  return apiClient.delete(`/tasks/${id}`);
}
