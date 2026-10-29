import { addDaysISO, todayISO, weekdayOf } from "@/lib/date";
import { colorForTitle } from "@/lib/scheduleColors";
import type { ClassEntity, ScheduleEvent, Subject } from "@/types";

export type OccurrenceStatus = "scheduled" | "cancelled" | "changed";
export type OccurrenceTimeState = "past" | "now" | "next" | "upcoming";

export interface ScheduleOccurrence {
  key: string;
  title: string;
  subjectId: string | null;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: string | null;
  status: OccurrenceStatus;
  changeNote: string | null;
  isImported: boolean;
  sourceClassId: string | null;
}

function resolveColor(subjectId: string | null, title: string, subjectById: Map<string, Subject>): string {
  const subject = subjectId ? subjectById.get(subjectId) : undefined;
  return subject?.color || colorForTitle(title);
}

function fromScheduleEvent(event: ScheduleEvent, subjectById: Map<string, Subject>): ScheduleOccurrence {
  return {
    key: `evt-${event.id}`,
    title: event.title,
    subjectId: event.subjectId,
    color: resolveColor(event.subjectId, event.title, subjectById),
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    room: event.room,
    teacher: event.teacher,
    status: event.status,
    changeNote: event.changeNote,
    isImported: true,
    sourceClassId: null,
  };
}

function fromClass(classItem: ClassEntity, date: string, subjectById: Map<string, Subject>): ScheduleOccurrence {
  const subject = subjectById.get(classItem.subjectId);
  const title = subject?.name || "Class";
  return {
    key: `cls-${classItem.id}-${date}`,
    title,
    subjectId: classItem.subjectId,
    color: resolveColor(classItem.subjectId, title, subjectById),
    date,
    startTime: classItem.startTime,
    endTime: classItem.endTime,
    room: classItem.room,
    teacher: classItem.teacher,
    status: "scheduled",
    changeNote: null,
    isImported: false,
    sourceClassId: classItem.id,
  };
}

// EduPage import is treated as the source of truth for a day: if any imported events
// exist for that date, they fully replace the recurring-class projection for it (the
// feed exports a complete day, so mixing both would just duplicate/confuse). Days the
// import doesn't cover fall back to the recurring weekly timetable, so the app still
// works fully for anyone who hasn't connected EduPage at all.
export function occurrencesForDate(
  date: string,
  weekday: number,
  importedEvents: ScheduleEvent[],
  classes: ClassEntity[],
  subjectById: Map<string, Subject>
): ScheduleOccurrence[] {
  const imported = importedEvents.filter((e) => e.date === date);
  const base =
    imported.length > 0
      ? imported.map((e) => fromScheduleEvent(e, subjectById))
      : classes.filter((c) => c.weekday === weekday).map((c) => fromClass(c, date, subjectById));

  return base.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Only meaningful when the occurrences belong to today - computes Past/Now/Next/Upcoming
// per the current wall-clock time, ignoring cancelled lessons for "now"/"next".
export function computeTimeStates(occurrences: ScheduleOccurrence[], nowMinutes: number): Map<string, OccurrenceTimeState> {
  const states = new Map<string, OccurrenceTimeState>();
  let nextAssigned = false;

  for (const occ of occurrences) {
    const start = toMinutes(occ.startTime);
    const end = toMinutes(occ.endTime);

    if (occ.status === "cancelled") {
      states.set(occ.key, end <= nowMinutes ? "past" : "upcoming");
      continue;
    }

    if (nowMinutes >= start && nowMinutes < end) {
      states.set(occ.key, "now");
    } else if (end <= nowMinutes) {
      states.set(occ.key, "past");
    } else if (!nextAssigned) {
      states.set(occ.key, "next");
      nextAssigned = true;
    } else {
      states.set(occ.key, "upcoming");
    }
  }

  return states;
}

export function isWeekendDate(dateStr: string): boolean {
  const wd = weekdayOf(dateStr);
  return wd === 0 || wd === 6;
}

// Steps by school day, skipping weekends entirely - "next day" from Friday lands on
// Monday, "previous day" from Monday lands on Friday.
export function stepSchoolDay(dateStr: string, direction: 1 | -1): string {
  let next = addDaysISO(dateStr, direction);
  while (isWeekendDate(next)) next = addDaysISO(next, direction);
  return next;
}

// Which day the schedule should open to: never a weekend, and once today's last
// (non-cancelled) class has ended, rolls forward to the next school day - so opening
// the app on Friday evening or on a Saturday shows next week/Monday, not a dead page.
export function computeDefaultAnchorDate(todayOccurrences: ScheduleOccurrence[], now: Date): string {
  const today = todayISO();
  if (isWeekendDate(today)) return stepSchoolDay(today, 1);

  const active = todayOccurrences.filter((o) => o.status !== "cancelled");
  if (active.length === 0) return today;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const lastEnd = Math.max(...active.map((o) => toMinutes(o.endTime)));

  return nowMinutes >= lastEnd ? stepSchoolDay(today, 1) : today;
}

// A flat, chronological list of upcoming (non-cancelled) occurrences starting from now,
// walking forward school day by school day - used for "Next class" / "Upcoming classes"
// on the dashboard so they follow the same weekend-skipping, already-finished-aware
// logic as the Schedule page instead of a separate parallel implementation.
export function getUpcomingOccurrences(
  classes: ClassEntity[],
  importedEvents: ScheduleEvent[],
  subjectById: Map<string, Subject>,
  count: number,
  now: Date
): ScheduleOccurrence[] {
  const results: ScheduleOccurrence[] = [];
  const today = todayISO();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let cursor = today;

  for (let i = 0; i < 30 && results.length < count; i++) {
    if (isWeekendDate(cursor)) {
      cursor = addDaysISO(cursor, 1);
      continue;
    }

    const dayOccurrences = occurrencesForDate(cursor, weekdayOf(cursor), importedEvents, classes, subjectById)
      .filter((o) => o.status !== "cancelled")
      .filter((o) => (cursor === today ? toMinutes(o.endTime) > nowMinutes : true));

    for (const occ of dayOccurrences) {
      results.push(occ);
      if (results.length >= count) break;
    }

    cursor = addDaysISO(cursor, 1);
  }

  return results;
}
