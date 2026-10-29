import type { ExamKind, TaskType } from "@/types";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  homework: "Homework",
  exam: "Exam",
};

// Internal keys (oral/quiz/major) are kept stable for the stored data - only the
// user-facing labels below changed to match the school's actual terminology.
export const EXAM_KIND_LABELS: Record<ExamKind, string> = {
  oral: "Oral Exam",
  quiz: "Unit Test",
  major: "Big exam",
};

export const EXAM_KINDS: ExamKind[] = ["oral", "quiz", "major"];
