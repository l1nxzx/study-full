import { apiClient } from "./client";

export type TestDifficulty = "easy" | "medium" | "hard" | "very_hard";
export type TestThinking = "recall" | "understanding" | "deep";
export type TestLogic = "low" | "medium" | "high";

export interface TestSettings {
  difficulty: TestDifficulty;
  thinking: TestThinking;
  logic: TestLogic;
  durationMinutes: number;
  instructions?: string;
}

export interface TestQuestion {
  id: string;
  prompt: string;
  points: number;
  estimatedMinutes: number;
  topic: string;
  /** Only present once the attempt has been graded. */
  modelAnswer?: string;
  criteria?: string[];
}

export type AttemptStatus = "in_progress" | "grading" | "submitted" | "graded";

export interface TestAttemptSummary {
  id: string;
  testId: string;
  status: AttemptStatus;
  startedAt: string;
  updatedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
  elapsedSeconds: number;
  answeredCount: number;
  totalPoints: number;
  awardedPoints: number | null;
  percent: number | null;
  gradingError: string | null;
}

export interface TestSummary {
  id: string;
  title: string;
  subjectId: string | null;
  noteIds: string[];
  noteTitles: string[];
  settings: TestSettings;
  questionCount: number;
  totalPoints: number;
  estimatedMinutes: number;
  createdAt: string;
}

export interface TestListItem extends TestSummary {
  attemptCount: number;
  gradedCount: number;
  bestPercent: number | null;
  lastPercent: number | null;
  openAttemptId: string | null;
  lastActivityAt: string;
}

export interface TestDetail extends TestSummary {
  questions: TestQuestion[];
  attempts: TestAttemptSummary[];
}

export interface QuestionGrade {
  id: string;
  awarded: number;
  max: number;
  feedback: string;
  correctAnswer: string;
  toLearn: string;
}

export interface TestAttempt extends TestAttemptSummary {
  answers: Record<string, string>;
  grading: { results: QuestionGrade[]; summary: string; strengths: string[]; toReview: string[] } | null;
  test: TestSummary & { questions: TestQuestion[] };
}

export function listTests() {
  return apiClient.get<TestListItem[]>("/tests").then((r) => r.data);
}

export function getTest(id: string) {
  return apiClient.get<TestDetail>(`/tests/${id}`).then((r) => r.data);
}

// Generating a long test takes a while; give it room.
export function createTest(input: { noteIds: string[]; title?: string; settings: TestSettings }) {
  return apiClient.post<TestDetail>("/tests", input, { timeout: 180_000 }).then((r) => r.data);
}

export function deleteTest(id: string) {
  return apiClient.delete(`/tests/${id}`);
}

export function startAttempt(testId: string) {
  return apiClient.post<TestAttempt>(`/tests/${testId}/attempts`).then((r) => r.data);
}

export function getAttempt(id: string) {
  return apiClient.get<TestAttempt>(`/test-attempts/${id}`).then((r) => r.data);
}

export function saveAnswers(id: string, answers: Record<string, string>, elapsedSeconds?: number) {
  return apiClient.patch<TestAttemptSummary>(`/test-attempts/${id}`, { answers, elapsedSeconds }).then((r) => r.data);
}

export function submitAttempt(id: string, answers?: Record<string, string>, elapsedSeconds?: number) {
  return apiClient
    .post<TestAttempt>(`/test-attempts/${id}/submit`, answers ? { answers, elapsedSeconds } : {}, { timeout: 180_000 })
    .then((r) => r.data);
}

// Grades a graded attempt again from the same answers; the new result replaces the old one.
export function regradeAttempt(id: string) {
  return apiClient.post<TestAttempt>(`/test-attempts/${id}/regrade`, {}, { timeout: 180_000 }).then((r) => r.data);
}

export function deleteAttempt(id: string) {
  return apiClient.delete(`/test-attempts/${id}`);
}
