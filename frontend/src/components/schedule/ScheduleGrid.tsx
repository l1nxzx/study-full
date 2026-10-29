import { useEffect, useState } from "react";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { addDaysISO } from "@/lib/date";
import type { ClassEntity, ScheduleEvent, Subject, Task } from "@/types";

interface ScheduleGridProps {
  weekStartDate: string; // Monday of the displayed week, YYYY-MM-DD
  classes: ClassEntity[];
  importedEvents: ScheduleEvent[];
  subjectById: Map<string, Subject>;
  onSelectClass: (classItem: ClassEntity) => void;
  tasks: Task[];
}

// Days stacked vertically (Monday through Friday), each day's lessons in a horizontal
// row of period cards - matching an actual school timetable rather than a generic
// calendar/time-axis grid.
export function ScheduleGrid({ weekStartDate, classes, importedEvents, subjectById, onSelectClass, tasks }: ScheduleGridProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dates = Array.from({ length: 5 }, (_, i) => addDaysISO(weekStartDate, i));

  return (
    <div className="space-y-5 border border-border bg-card p-3 sm:p-4">
      {dates.map((date) => (
        <DayCardRow
          key={date}
          date={date}
          classes={classes}
          importedEvents={importedEvents}
          subjectById={subjectById}
          now={now}
          showStatus
          onSelectClass={onSelectClass}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
