import { useLocation } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { useNotes } from "@/hooks/useNotes";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useTasks } from "@/hooks/useTasks";
import { addDaysISO, formatDateShort, formatTime, todayISO, weekdayOf } from "@/lib/date";
import { occurrencesForDate } from "@/lib/scheduleOccurrence";
import type { Subject } from "@/types";

const CONTEXT_WINDOW_FROM = addDaysISO(todayISO(), -1);
const CONTEXT_WINDOW_TO = addDaysISO(todayISO(), 14);
const MAX_SCHEDULE_DAYS = 7;
const MAX_TASKS = 12;
const MAX_NOTES = 15;

// A short, page-appropriate suggestion shown as the chat's empty-state hint (and
// nowhere else) - purely cosmetic, no data fetching involved.
export function chatHintFor(pathname: string): string {
  if (pathname.startsWith("/schedule") || pathname === "/dashboard") {
    return "Ask about your next classes, substitutions, or cancellations.";
  }
  if (pathname.startsWith("/tasks")) return "Ask what's due, or what to prioritize.";
  if (pathname.startsWith("/subjects/")) return "Ask about this subject's notes or tasks.";
  return "Ask me anything about your studies.";
}

function pageLabelFor(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard (overview)";
  if (pathname.startsWith("/schedule")) return "Schedule (weekly timetable / EduPage import)";
  if (pathname === "/notes/new") return "creating a new note";
  if (/^\/notes\/[^/]+$/.test(pathname)) return "a specific note";
  if (pathname === "/notes") return "Notes list";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/subjects/")) return "a subject's page (its notes and tasks)";
  if (pathname.startsWith("/class-sessions/")) return "a class session";
  if (pathname.startsWith("/settings")) return "Settings";
  return "the app";
}

// Builds a compact, plain-text summary of the user's own data (never note content) so
// the general study chat can answer things like "am I substituted tomorrow?" or "what's
// due this week?" without needing a note open. Only fetches its underlying data once the
// AI panel is actually open (`enabled`), and shares the same React Query cache/staleTime
// as the rest of the app, so it doesn't add its own steady stream of requests.
export function useAiContextSummary(enabled: boolean): string | undefined {
  const location = useLocation();
  const { data: subjects } = useSubjects({ enabled });
  const { data: tasks } = useTasks({}, { enabled });
  const { data: classes } = useClasses({ enabled });
  const { data: notes } = useNotes({}, { enabled });
  const { data: events } = useScheduleEvents(CONTEXT_WINDOW_FROM, CONTEXT_WINDOW_TO, { enabled });

  if (!enabled) return undefined;
  if (!subjects || !tasks || !classes || !notes || !events) return undefined;

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const lines: string[] = [];

  lines.push(`Current page: ${pageLabelFor(location.pathname)}.`);

  if (subjects.length > 0) {
    lines.push(`Subjects: ${subjects.map((s: Subject) => s.name).join(", ")}.`);
  }

  const openTasks = tasks.filter((t) => !t.completed).slice(0, MAX_TASKS);
  if (openTasks.length > 0) {
    const today = todayISO();
    const taskLines = openTasks.map((t) => {
      const subjectName = t.subjectId ? subjectById.get(t.subjectId)?.name : undefined;
      const due = t.dueDate ? (t.dueDate < today ? `overdue since ${formatDateShort(t.dueDate)}` : `due ${formatDateShort(t.dueDate)}`) : "no due date";
      return `- ${t.title}${subjectName ? ` (${subjectName})` : ""} - ${due}`;
    });
    lines.push(`Open tasks:\n${taskLines.join("\n")}`);
  } else {
    lines.push("Open tasks: none.");
  }

  const scheduleLines: string[] = [];
  let cursor = todayISO();
  for (let i = 0; i < MAX_SCHEDULE_DAYS; i++) {
    const wd = weekdayOf(cursor);
    if (wd !== 0 && wd !== 6) {
      const occs = occurrencesForDate(cursor, wd, events, classes, subjectById);
      if (occs.length > 0) {
        const dayLine = occs
          .map((o) => {
            const flag = o.status === "cancelled" ? " [CANCELLED]" : o.status === "changed" ? " [SUBSTITUTED/CHANGED]" : "";
            return `${o.title} ${formatTime(o.startTime)}${flag}`;
          })
          .join(", ");
        scheduleLines.push(`${formatDateShort(cursor)}: ${dayLine}`);
      }
    }
    cursor = addDaysISO(cursor, 1);
  }
  if (scheduleLines.length > 0) {
    lines.push(`Upcoming schedule (next school days, [CANCELLED]/[SUBSTITUTED] flags come straight from EduPage):\n${scheduleLines.join("\n")}`);
  }

  if (notes.length > 0) {
    const noteLines = notes.slice(0, MAX_NOTES).map((n) => {
      const subjectName = n.subjectId ? subjectById.get(n.subjectId)?.name : undefined;
      return `- "${n.title}"${subjectName ? ` (${subjectName})` : ""}`;
    });
    lines.push(`Recent note titles (content not included):\n${noteLines.join("\n")}`);
  }

  return lines.join("\n\n").slice(0, 4000);
}
