import { apiClient } from "./client";

export interface SummaryResult {
  quickSummary: string;
  keyPoints: string[];
}

export interface ExplainResult {
  explanation: string;
}

export type QuizQuestion =
  | { type: "multiple_choice"; question: string; options: string[]; correctIndex: number; explanation: string; beyondNotes?: boolean }
  | { type: "true_false"; question: string; correctAnswer: boolean; explanation: string; beyondNotes?: boolean }
  | { type: "short_answer"; question: string; sampleAnswer: string; explanation: string; beyondNotes?: boolean };

export interface QuizResult {
  questions: QuizQuestion[];
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface FlashcardsResult {
  cards: Flashcard[];
}

export interface PracticeQuestion {
  question: string;
  type: "calculation" | "short_answer" | "application" | "concept";
  hint?: string;
  answer: string;
  beyondNotes?: boolean;
}

export interface PracticeResult {
  questions: PracticeQuestion[];
}

export interface AskResult {
  answer: string;
  groundedInNote: boolean;
}

export function getSummary(noteId: string, forceRefresh = false) {
  return apiClient.post<SummaryResult>("/ai/summary", { noteId, forceRefresh }).then((r) => r.data);
}

export function getExplanation(noteId: string, text: string, mode: "simple" | "detailed", forceRefresh = false) {
  return apiClient.post<ExplainResult>("/ai/explain", { noteId, text, mode, forceRefresh }).then((r) => r.data);
}

export function generateQuiz(params: {
  noteIds: string[];
  numQuestions: 5 | 10 | 15 | 20;
  difficulty: "easy" | "medium" | "hard";
  questionTypes: ("multiple_choice" | "true_false" | "short_answer")[];
  includeBeyondNotes?: boolean;
}) {
  return apiClient.post<QuizResult>("/ai/quiz", params).then((r) => r.data);
}

export function generateFlashcards(noteIds: string[], count: number) {
  return apiClient.post<FlashcardsResult>("/ai/flashcards", { noteIds, count }).then((r) => r.data);
}

export function generatePractice(params: {
  noteIds: string[];
  numQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  includeBeyondNotes?: boolean;
}) {
  return apiClient.post<PracticeResult>("/ai/practice", params).then((r) => r.data);
}

export function askNote(noteId: string, question: string, history: { role: "user" | "assistant"; content: string }[]) {
  return apiClient.post<AskResult>("/ai/ask", { noteId, question, history }).then((r) => r.data);
}

export interface ChatResult {
  answer: string;
}

export function chat(message: string, history: { role: "user" | "assistant"; content: string }[], context?: string) {
  return apiClient.post<ChatResult>("/ai/chat", { message, history, context }).then((r) => r.data);
}

export interface RewriteResult {
  rewritten: string;
}

export interface RewriteOptions {
  scope: "full" | "selection";
  selectionText?: string;
  instructions?: string;
}

export function rewriteNote(noteId: string, options: RewriteOptions) {
  return apiClient.post<RewriteResult>("/ai/rewrite", { noteId, ...options }).then((r) => r.data);
}
