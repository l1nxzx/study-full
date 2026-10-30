import type { QuizQuestion } from "./ai";
import { apiClient } from "./client";

export interface QuizAnswer {
  checked: boolean;
  selectedIndex?: number;
  selectedBool?: boolean;
  shortAnswerText?: string;
  markedCorrect?: boolean;
}

export interface QuizSettings {
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  questionTypes: ("multiple_choice" | "true_false" | "short_answer")[];
  includeBeyondNotes?: boolean;
  instructions?: string;
}

export interface QuizAttemptSummary {
  id: string;
  noteId: string;
  noteIds: string[];
  subjectId: string | null;
  title: string;
  settings: QuizSettings;
  status: "in_progress" | "completed";
  score: number;
  answered: number;
  total: number;
  retryOf: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface QuizAttempt extends QuizAttemptSummary {
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}

export function listQuizzes(noteId?: string) {
  return apiClient.get<QuizAttemptSummary[]>("/quizzes", { params: { noteId } }).then((r) => r.data);
}

export function getQuiz(id: string) {
  return apiClient.get<QuizAttempt>(`/quizzes/${id}`).then((r) => r.data);
}

export function createQuiz(input: { noteIds: string[]; settings: QuizSettings; questions: QuizQuestion[]; retryOf?: string }) {
  return apiClient.post<QuizAttempt>("/quizzes", input).then((r) => r.data);
}

export function saveQuiz(id: string, answers: QuizAnswer[], completed?: boolean) {
  return apiClient.patch<QuizAttempt>(`/quizzes/${id}`, { answers, completed }).then((r) => r.data);
}

export function deleteQuiz(id: string) {
  return apiClient.delete(`/quizzes/${id}`);
}
