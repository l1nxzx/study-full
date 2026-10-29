import { useNavigate } from "react-router-dom";
import { DayStatusBadge } from "@/components/schedule/DayStatusBadge";
import { PeriodCard } from "@/components/schedule/PeriodCard";
import { DueTaskChip } from "@/components/tasks/DueTaskChip";
import { describeDayRelativeToToday, formatDateWithWeekday, todayISO, weekdayOf } from "@/lib/date";
import { computeTimeStates, occurrencesForDate, type ScheduleOccurrence } from "@/lib/scheduleOccurrence";
import { computeDayStatus } from "@/lib/scheduleStatus";
import { tasksDueOn } from "@/lib/taskGroups";
import type { ClassEntity, ScheduleEvent, Subject, Task } from "@/types";

interface DayCardRowProps {
  date: string;
  classes: ClassEntity[];
  importedEvents: ScheduleEvent[];
  subjectById: Map<string, Subject>;
  now: Date;
  showStatus?: boolean;
  compactLabel?: boolean;
  onSelectClass?: (classItem: ClassEntity) => void;
  tasks?: Task[];
}

export function DayCardRow({
  date,
  classes,
  importedEvents,
  subjectById,
  now,
  showStatus,
  compactLabel,
  onSelectClass,
  tasks,
}: DayCardRowProps) {
  const navigate = useNavigate();
  const occurrences = occurrencesForDate(date, weekdayOf(date), importedEvents, classes, subjectById);
  const dueTasks = tasksDueOn(tasks || [], date);
  const isToday = date === todayISO();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const timeStates = isToday ? computeTimeStates(occurrences, nowMinutes) : new Map();
  const status = showStatus && isToday ? computeDayStatus(occurrences, now) : null;

  // Clicking a card either opens the recurring class for editing (week view only, and
  // only for non-imported occurrences), or - whenever there's a linked Subject - jumps
  // straight to that subject's notes/tasks, which is the whole point of auto-linking
  // imported lessons to a Subject.
  function handleSelect(occ: ScheduleOccurrence) {
    if (!occ.isImported && occ.sourceClassId && onSelectClass) {
      const classItem = classes.find((c) => c.id === occ.sourceClassId);
      if (classItem) {
        onSelectClass(classItem);
        return;
      }
    }
    if (occ.subjectId) {
      navigate(`/subjects/${occ.subjectId}`);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">{describeDayRelativeToToday(date)}</p>
          {!compactLabel && <h3 className="text-base font-semibold text-foreground">{formatDateWithWeekday(date)}</h3>}
        </div>
        {status && <DayStatusBadge status={status} />}
      </div>

      {occurrences.length === 0 ? (
        <p className="border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">No classes.</p>
      ) : (
        <div className="inline-flex max-w-full divide-x divide-border overflow-x-auto border border-border">
          {occurrences.map((occ, i) => (
            <PeriodCard
              key={occ.key}
              occurrence={occ}
              periodNumber={i + 1}
              timeState={timeStates.get(occ.key)}
              nowMinutes={nowMinutes}
              onClick={occ.subjectId || (onSelectClass && occ.sourceClassId) ? () => handleSelect(occ) : undefined}
            />
          ))}
        </div>
      )}

      {dueTasks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dueTasks.map((task) => (
            <DueTaskChip key={task.id} task={task} subject={task.subjectId ? subjectById.get(task.subjectId) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
