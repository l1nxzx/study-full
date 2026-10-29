import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { Button } from "@/components/ui/button";
import { formatDateShort, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, occurrencesForDate, stepSchoolDay } from "@/lib/scheduleOccurrence";
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

export function ScheduleDayView({ anchorDate, onAnchorChange, classes, importedEvents, subjectById, tasks }: ScheduleDayViewProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  function goToSmartToday() {
    const today = todayISO();
    const todayOccurrences = occurrencesForDate(today, weekdayOf(today), importedEvents, classes, subjectById);
    onAnchorChange(computeDefaultAnchorDate(todayOccurrences, new Date()));
  }

  const nextDate = stepSchoolDay(anchorDate, 1);
  const upcomingDates: string[] = [];
  let cursor = nextDate;
  for (let i = 0; i < 3; i++) {
    cursor = stepSchoolDay(cursor, 1);
    upcomingDates.push(cursor);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" onClick={() => onAnchorChange(stepSchoolDay(anchorDate, -1))} title="Previous school day">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToSmartToday}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => onAnchorChange(stepSchoolDay(anchorDate, 1))} title="Next school day">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <DayCardRow date={anchorDate} classes={classes} importedEvents={importedEvents} subjectById={subjectById} now={now} showStatus tasks={tasks} />

      <DayCardRow date={nextDate} classes={classes} importedEvents={importedEvents} subjectById={subjectById} now={now} tasks={tasks} />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</p>
        <div className="grid grid-cols-3 gap-2">
          {upcomingDates.map((date) => {
            const occurrences = occurrencesForDate(date, weekdayOf(date), importedEvents, classes, subjectById);
            const active = occurrences.filter((o) => o.status !== "cancelled");
            const due = tasksDueOn(tasks, date);
            const parts = [
              active.length > 0 ? `${active.length} class${active.length === 1 ? "" : "es"}` : null,
              due.length > 0 ? `${due.length} due` : null,
            ].filter(Boolean);
            return (
              <button
                key={date}
                onClick={() => onAnchorChange(date)}
                className="rounded-lg border border-border px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <p className="text-xs font-medium text-foreground">{formatDateShort(date)}</p>
                <p className="text-[11px] text-muted-foreground">{parts.length > 0 ? parts.join(" · ") : "Nothing scheduled"}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
