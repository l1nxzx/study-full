export type ReadingFont = "literata" | "instrument" | "system-serif" | "system-sans";
export type UiFont = "instrument" | "system";

export interface Preferences {
  readingFont?: ReadingFont;
  uiFont?: UiFont;
  notebookPaper?: "light" | "dark";
  notebookTextSize?: "small" | "medium" | "large";
  dismissedTips?: string[];
  /** Subjects pinned to the top of the sidebar, in order. */
  pinnedSubjects?: string[];
  /** How many subjects the sidebar shows before "Show more"; 0 shows all. */
  sidebarSubjectCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  preferences?: Preferences;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectDetail extends Subject {
  recentNotes: Note[];
  upcomingTasks: Task[];
  recentSessions: ClassSession[];
  schedule: ClassEntity[];
  noteCount: number;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassEntity {
  id: string;
  userId: string;
  subjectId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSession {
  id: string;
  userId: string;
  classId: string | null;
  subjectId: string;
  date: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSessionDetail extends ClassSession {
  notes: Note[];
  tasks: Task[];
}

export interface Note {
  id: string;
  userId: string;
  /** null once the note's subject was deleted and the note kept. */
  subjectId: string | null;
  sessionId: string | null;
  title: string;
  date: string;
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetail extends Note {
  attachments: Attachment[];
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
  createdAt: string;
}

export type TaskType = "homework" | "exam";
export type ExamKind = "oral" | "quiz" | "major";

export interface Task {
  id: string;
  userId: string;
  subjectId: string | null;
  sessionId: string | null;
  type: TaskType;
  examKind: ExamKind | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleEventStatus = "scheduled" | "cancelled" | "changed";

export interface ScheduleEvent {
  id: string;
  userId: string;
  externalUid: string;
  source: "edupage";
  subjectId: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: string | null;
  status: ScheduleEventStatus;
  changeNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  type: "subject" | "note" | "class_session" | "task";
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
