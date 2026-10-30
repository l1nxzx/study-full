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

// Monday to Friday as rows, each day's lessons running left to right - the shape of an actual
// school timetable rather than a calendar with a time axis.
export function ScheduleGrid({ weekStartDate, classes, importedEvents, subjectById, onSelectClass, tasks }: ScheduleGridProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dates = Array.from({ length: 5 }, (_, i) => addDaysISO(weekStartDate, i));

  return (
    <div className="space-y-7 @2xl:space-y-5">
      {dates.map((date) => (
        <DayCardRow
          key={date}
          layout="week"
          date={date}
          classes={classes}
          importedEvents={importedEvents}
          subjectById={subjectById}
          now={now}
          onSelectClass={onSelectClass}
          tasks={tasks}
        />
      ))}
    </div>
  );
}
