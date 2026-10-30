/** "2 h 15 min", "45 min", "under a minute" - study time as a person would say it. */
export function formatStudyTime(seconds: number): string {
  if (seconds < 60) return seconds > 0 ? "under a minute" : "none yet";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Compact form for chart labels: "2.3h", "45m". */
export function formatShort(seconds: number): string {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(seconds >= 36000 ? 0 : 1)}h`;
  return `${Math.round(seconds / 60)}m`;
}

export const AREA_LABELS: Record<string, string> = {
  notes: "Reading notes",
  notebook: "Notebook view",
  assistant: "Asking the assistant",
  quiz: "Quizzes",
  flashcards: "Flashcards",
  tests: "Tests",
  planning: "Planning",
  other: "Other",
};
