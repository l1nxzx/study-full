import { useEffect, useState } from "react";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { formatDayShort, weekdayOf } from "@/lib/date";
import { occurrencesForDate, stepSchoolDay } from "@/lib/scheduleOccurrence";
import { tasksDueOn } from "@/lib/taskGroups";
import type { ClassEntity, ScheduleEvent, Subject, Task } from "@/types";

interface ScheduleDayViewProps {
  anchorDate: string;
  onAnchorChange: (date: string) => void;
  classes: ClassEntity[];
  importedEvents: ScheduleEvent[];
  subjectById: Map<string, Subject>;
  tasks: Task[];
}

// The selected school day and the one after it in full, then a short look further ahead.
export function ScheduleDayView({ anchorDate, onAnchorChange, classes, importedEvents, subjectById, tasks }: ScheduleDayViewProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const nextDate = stepSchoolDay(anchorDate, 1);
  const upcomingDates: string[] = [];
  let cursor = nextDate;
  for (let i = 0; i < 3; i++) {
    cursor = stepSchoolDay(cursor, 1);
    upcomingDates.push(cursor);
  }

  return (
    <div className="space-y-12">
      <DayCardRow date={anchorDate} classes={classes} importedEvents={importedEvents} subjectById={subjectById} now={now} showStatus tasks={tasks} />

      <DayCardRow date={nextDate} classes={classes} importedEvents={importedEvents} subjectById={subjectById} now={now} tasks={tasks} />

      <section>
        <h3 className="group-label border-b border-rule pb-2">Further ahead</h3>
        <div className="divide-y divide-rule">
          {upcomingDates.map((date) => {
            const occurrences = occurrencesForDate(date, weekdayOf(date), importedEvents, classes, subjectById);
            const active = occurrences.filter((o) => o.status !== "cancelled");
            const changed = occurrences.filter((o) => o.status !== "scheduled").length;
            const due = tasksDueOn(tasks, date);
            const parts = [
              active.length > 0 ? `${active.length} ${active.length === 1 ? "class" : "classes"}` : "No classes",
              due.length > 0 ? `${due.length} due` : null,
            ].filter(Boolean);
            return (
              <button
                key={date}
                type="button"
                onClick={() => onAnchorChange(date)}
                className="group flex w-full items-baseline justify-between gap-4 py-2.5 text-left"
              >
                <span className="text-sm font-medium text-fg transition-colors group-hover:text-accent">{formatDayShort(date)}</span>
                <span className="text-[0.8125rem] text-fg-muted">
                  {parts.join(" · ")}
                  {changed > 0 && <span className="text-warn"> · {changed} changed</span>}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
