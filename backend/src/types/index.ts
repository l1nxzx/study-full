import type { Timestamp } from "firebase-admin/firestore";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday ... 6 = Saturday

export interface ClassEntity {
  id: string;
  userId: string;
  subjectId: string;
  weekday: Weekday;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  room?: string;
  teacher?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassSession {
  id: string;
  userId: string;
  classId: string | null;
  subjectId: string;
  date: string; // "YYYY-MM-DD"
  title?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Note {
  id: string;
  userId: string;
  subjectId: string;
  sessionId: string | null;
  title: string;
  date: string; // "YYYY-MM-DD"
  contentMarkdown: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Attachment {
  id: string;
  userId: string;
  noteId: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  userId: string;
  subjectId: string | null;
  sessionId: string | null;
  title: string;
  dueDate: string | null; // "YYYY-MM-DD"
  completed: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
