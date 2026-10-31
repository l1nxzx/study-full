import { todayISO } from "@/lib/date";
import { apiClient } from "./client";

export type ActivityArea = "notes" | "notebook" | "assistant" | "quiz" | "flashcards" | "tests" | "planning" | "other";

export interface DaySeconds {
  date: string;
  seconds: number;
}

export interface QuizStats {
  completed: number;
  inProgress: number;
  answered: number;
  correct: number;
  accuracy: number | null;
  recent: { id: string; noteId: string; title: string; score: number; total: number; completedAt: string }[];
  missed: { attemptId: string; noteId: string; noteTitle: string; question: string; at: string }[];
}

export interface TestStats {
  graded: number;
  averagePercent: number | null;
  bestPercent: number | null;
  recent: { attemptId: string; testId: string; title: string; percent: number; awardedPoints: number; totalPoints: number; gradedAt: string }[];
  toReview: { topic: string; count: number }[];
}

export interface SessionView {
  id: string;
  startedAt: string;
  lastActiveAt: string;
  seconds: number;
  mainArea: ActivityArea;
  byArea: Partial<Record<ActivityArea, number>>;
  notes: { noteId: string; title: string; seconds: number }[];
  subjects: { subjectId: string; name: string; seconds: number }[];
}

export interface OverviewStats {
  /** When the server computed this answer (see lib/studyLedger). */
  asOf: number;
  time: {
    totalSeconds: number;
    todaySeconds: number;
    last7Seconds: number;
    last30Seconds: number;
    activeDays: number;
    firstDate: string | null;
    days: DaySeconds[];
    byArea: Partial<Record<ActivityArea, number>>;
    byHour: number[];
    byWeekday: number[];
    bySubject: { subjectId: string; name: string; color: string | null; seconds: number }[];
    topNotes: { noteId: string; title: string; subjectId: string; seconds: number }[];
  };
  sessions: { count: number; averageSeconds: number; longestSeconds: number; recent: SessionView[] };
  quizzes: QuizStats;
  tests: TestStats;
  assistant: { conversations: number; questionsAsked: number };
  counts: { notes: number; subjects: number; tests: number };
}

export interface NoteStats {
  /** When the server computed this answer (see lib/studyLedger). */
  asOf: number;
  time: { totalSeconds: number; last7Seconds: number; days: DaySeconds[]; firstStudied: string | null; lastStudied: string | null };
  sessions: number;
  quizzes: QuizStats;
  tests: TestStats & { count: number };
  assistant: { conversations: number; questionsAsked: number };
}

export interface SubjectStats {
  /** When the server computed this answer (see lib/studyLedger). */
  asOf: number;
  time: { totalSeconds: number; last7Seconds: number; days: DaySeconds[]; topNotes: { noteId: string; title: string; seconds: number }[] };
  sessions: number;
  quizzes: QuizStats;
  tests: TestStats;
  assistant: { conversations: number; questionsAsked: number };
}

const params = () => ({ today: todayISO(), tz: new Date().getTimezoneOffset() });

export function getOverview() {
  return apiClient.get<OverviewStats>("/stats/overview", { params: params() }).then((r) => r.data);
}

export function getNoteStats(id: string) {
  return apiClient.get<NoteStats>(`/stats/notes/${id}`, { params: params() }).then((r) => r.data);
}

export function getSubjectStats(id: string) {
  return apiClient.get<SubjectStats>(`/stats/subjects/${id}`, { params: params() }).then((r) => r.data);
}
