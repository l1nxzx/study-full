import type { ActivityArea } from "@/api/stats";

export interface ActivityContext {
  area: ActivityArea;
  noteId?: string;
  subjectId?: string;
  testId?: string;
}

// Pages can add what the URL alone doesn't say (e.g. which test an attempt belongs to).
let hint: Partial<ActivityContext> | null = null;

export function setActivityHint(next: Partial<ActivityContext> | null) {
  hint = next;
}

export function getActivityHint() {
  return hint;
}
