import type { TestSettings } from "./tests";
import { apiClient } from "./client";

// A saved way to set up a test (typically one per teacher): settings plus notes for the AI.
export interface TestTemplate {
  id: string;
  name: string;
  /** The subject it's for; offered first (and picked automatically) for that subject's notes. */
  subjectId: string | null;
  settings: TestSettings;
  createdAt: string;
  updatedAt: string;
}

export type TestTemplateInput = Pick<TestTemplate, "name" | "subjectId" | "settings">;

export function listTemplates() {
  return apiClient.get<TestTemplate[]>("/test-templates").then((r) => r.data);
}

export function createTemplate(input: TestTemplateInput) {
  return apiClient.post<TestTemplate>("/test-templates", input).then((r) => r.data);
}

export function updateTemplate(id: string, input: Partial<TestTemplateInput>) {
  return apiClient.patch<TestTemplate>(`/test-templates/${id}`, input).then((r) => r.data);
}

export function deleteTemplate(id: string) {
  return apiClient.delete(`/test-templates/${id}`);
}
