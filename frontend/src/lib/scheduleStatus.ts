import { minutesSinceMidnight } from "@/lib/date";
import type { ScheduleOccurrence } from "@/lib/scheduleOccurrence";

export interface DayStatus {
  label: string;
  detail: string;
}

// A live "where are we right now" summary for today, the same idea as EduPage's little
// clock widget (e.g. "hooray, weekend") - in class / on a break / not started yet /
// already finished / weekend.
export function computeDayStatus(occurrences: ScheduleOccurrence[], now: Date): DayStatus {
  const weekday = now.getDay();
  if (weekday === 0 || weekday === 6) {
    return { label: "Weekend", detail: "No school today" };
  }

  const active = occurrences.filter((o) => o.status !== "cancelled").sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (active.length === 0) {
    return { label: "No classes", detail: "Nothing scheduled today" };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const starts = active.map((o) => minutesSinceMidnight(o.startTime));
  const ends = active.map((o) => minutesSinceMidnight(o.endTime));

  for (let i = 0; i < active.length; i++) {
    if (nowMinutes >= starts[i] && nowMinutes < ends[i]) {
      return { label: "In class", detail: `${ends[i] - nowMinutes} min left · ${active[i].title}` };
    }
  }

  if (nowMinutes < starts[0]) {
    return { label: "Not started", detail: `Starts in ${starts[0] - nowMinutes} min` };
  }

  if (nowMinutes >= ends[ends.length - 1]) {
    return { label: "Finished", detail: "No more classes today" };
  }

  const nextIndex = starts.findIndex((s) => s > nowMinutes);
  const next = active[nextIndex];
  return { label: "Break", detail: `${starts[nextIndex] - nowMinutes} min left · Next: ${next.title}` };
}
