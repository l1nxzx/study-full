import { useNavigate } from "react-router-dom";
import { DayStatusBadge } from "@/components/schedule/DayStatusBadge";
import { PeriodCard } from "@/components/schedule/PeriodCard";
import { DueTaskChip } from "@/components/tasks/DueTaskChip";
import { formatDateShort, formatMonthDay, relativeDayLabel, todayISO, weekdayOf } from "@/lib/date";
import { computeTimeStates, occurrencesForDate, type ScheduleOccurrence } from "@/lib/scheduleOccurrence";
import { computeDayStatus } from "@/lib/scheduleStatus";
import { tasksDueOn } from "@/lib/taskGroups";
import { cn } from "@/lib/utils";
import type { ClassEntity, ScheduleEvent, Subject, Task } from "@/types";

interface DayCardRowProps {
  date: string;
  classes: ClassEntity[];
  importedEvents: ScheduleEvent[];
  subjectById: Map<string, Subject>;
  now: Date;
  showStatus?: boolean;
  /** "day": heading above the lessons. "week": a timetable row with the day in a left column. */
  layout?: "day" | "week";
  onSelectClass?: (classItem: ClassEntity) => void;
  tasks?: Task[];
}

// One school day: its lessons as a horizontal timetable strip (a vertical list on phones,
// where a strip would need sideways scrolling), plus anything due that day.
export function DayCardRow({
  date,
  classes,
  importedEvents,
  subjectById,
  now,
  showStatus,
  layout = "day",
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

  const clickHandler = (occ: ScheduleOccurrence) =>
    occ.subjectId || (onSelectClass && occ.sourceClassId) ? () => handleSelect(occ) : undefined;

  const lessons =
    occurrences.length === 0 ? (
      <p className="py-3 text-sm text-fg-faint">No classes.</p>
    ) : (
      <>
        <div className="divide-y divide-rule border-y border-rule @3xl:hidden">
          {occurrences.map((occ, i) => (
            <PeriodCard
              key={occ.key}
              layout="row"
              occurrence={occ}
              periodNumber={i + 1}
              timeState={timeStates.get(occ.key)}
              nowMinutes={nowMinutes}
              onClick={clickHandler(occ)}
            />
          ))}
        </div>
        <div
          className="hidden divide-x divide-rule overflow-x-auto border-y border-rule @3xl:grid"
          style={{ gridTemplateColumns: `repeat(${occurrences.length}, minmax(7.25rem, 1fr))` }}
        >
          {occurrences.map((occ, i) => (
            <PeriodCard
              key={occ.key}
              occurrence={occ}
              periodNumber={i + 1}
              timeState={timeStates.get(occ.key)}
              nowMinutes={nowMinutes}
              onClick={clickHandler(occ)}
            />
          ))}
        </div>
      </>
    );

  const due = dueTasks.length > 0 && (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-meta text-fg-faint">Due</span>
      {dueTasks.map((task) => (
        <DueTaskChip key={task.id} task={task} subject={task.subjectId ? subjectById.get(task.subjectId) : undefined} />
      ))}
    </div>
  );

  if (layout === "week") {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 @2xl:grid-cols-[6.5rem_minmax(0,1fr)]">
        <div className="flex items-baseline gap-2 @2xl:block @2xl:pt-2.5">
          <p className={cn("text-sm font-semibold", isToday ? "text-accent" : "text-fg")}>{relativeDayLabel(date)}</p>
          <p className="text-[0.8125rem] text-fg-muted tabular">{formatDateShort(date)}</p>
        </div>
        <div className="min-w-0">
          {lessons}
          {due}
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="flex items-baseline gap-2">
          <span className="section-title">{relativeDayLabel(date)}</span>
          <span className="text-[0.8125rem] text-fg-muted">{formatMonthDay(date)}</span>
        </h3>
        {status && <DayStatusBadge status={status} />}
      </div>
      {lessons}
      {due}
    </section>
  );
}
