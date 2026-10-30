import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { ClassFormDialog } from "@/components/schedule/ClassFormDialog";
import { ScheduleDayView } from "@/components/schedule/ScheduleDayView";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { ScheduleSyncStatus } from "@/components/schedule/ScheduleSyncStatus";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/hooks/useClasses";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useTasks } from "@/hooks/useTasks";
import { addDaysISO, formatDateShort, formatDayShort, mondayOfWeek, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, occurrencesForDate, stepSchoolDay } from "@/lib/scheduleOccurrence";
import type { ClassEntity } from "@/types";

// A fixed, generous fetch window rather than refetching on every day/week navigation -
// plenty for how far a student actually browses their own schedule.
const FETCH_FROM = addDaysISO(todayISO(), -14);
const FETCH_TO = addDaysISO(todayISO(), 60);

const navButton =
  "flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-tint hover:text-fg disabled:opacity-40 sm:size-8";

export function SchedulePage() {
  const { data: classes, isLoading } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: importedEvents } = useScheduleEvents(FETCH_FROM, FETCH_TO);
  const { data: tasks } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [anchorDate, setAnchorDate] = useState(todayISO());

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));
  const events = importedEvents || [];
  // Tasks/exams also count as "something to show" - a student who hasn't set up classes
  // yet but has homework or an exam due still needs the day view, not the classes-only
  // empty state.
  const hasAnySchedule = (classes && classes.length > 0) || events.length > 0 || (tasks && tasks.length > 0);

  // Once data is available, jump to the "smart" default day once (never a weekend, and
  // rolled forward past a finished school day) - but only the first time, so it never
  // fights the user's own navigation afterward.
  const hasSetDefault = useRef(false);
  useEffect(() => {
    if (hasSetDefault.current || !classes || !importedEvents) return;
    hasSetDefault.current = true;
    const today = todayISO();
    const todayOccurrences = occurrencesForDate(today, weekdayOf(today), events, classes, subjectById);
    setAnchorDate(computeDefaultAnchorDate(todayOccurrences, new Date()));
  }, [classes, importedEvents]);

  function goToSmartToday() {
    const today = todayISO();
    const todayOccurrences = occurrencesForDate(today, weekdayOf(today), events, classes || [], subjectById);
    setAnchorDate(computeDefaultAnchorDate(todayOccurrences, new Date()));
  }

  function step(direction: 1 | -1) {
    setAnchorDate((d) => (view === "day" ? stepSchoolDay(d, direction) : addDaysISO(d, 7 * direction)));
  }

  function openNew() {
    setEditingClass(null);
    setDialogOpen(true);
  }

  function openEdit(classItem: ClassEntity) {
    setEditingClass(classItem);
    setDialogOpen(true);
  }

  const weekStart = mondayOfWeek(anchorDate);
  const rangeLabel =
    view === "day" ? formatDayShort(anchorDate) : `${formatDateShort(weekStart)} – ${formatDateShort(addDaysISO(weekStart, 4))}`;

  return (
    <Page width="wide">
      <PageHeader
        title="Schedule"
        description={<ScheduleSyncStatus />}
        actions={
          <Button variant="outline" onClick={openNew}>
            <Plus /> Add class
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-3 gap-px sm:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-none" />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !hasAnySchedule && (
        <EmptyState
          title="No timetable yet"
          description={
            <>
              Add your weekly classes one by one, or{" "}
              <Link to="/settings" className="text-accent underline-offset-4 hover:underline">
                connect your EduPage calendar
              </Link>{" "}
              to import the whole timetable with substitutions and cancellations.
            </>
          }
          action={
            <Button onClick={openNew}>
              <Plus /> Add a class
            </Button>
          }
        />
      )}

      {!isLoading && hasAnySchedule && (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
            <div className="flex items-center gap-1">
              <button type="button" className={navButton} onClick={() => step(-1)} aria-label={view === "day" ? "Previous school day" : "Previous week"}>
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" className={navButton} onClick={() => step(1)} aria-label={view === "day" ? "Next school day" : "Next week"}>
                <ChevronRight className="size-4" />
              </button>
              <p className="ml-2 text-sm font-medium tabular text-fg">{rangeLabel}</p>
              <Button variant="ghost" size="sm" onClick={goToSmartToday} className="ml-2">
                Today
              </Button>
            </div>
            <Segmented
              label="View"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
              ]}
            />
          </div>

          {view === "day" ? (
            <ScheduleDayView
              anchorDate={anchorDate}
              onAnchorChange={setAnchorDate}
              classes={classes || []}
              importedEvents={events}
              subjectById={subjectById}
              tasks={tasks || []}
            />
          ) : (
            <ScheduleGrid
              weekStartDate={weekStart}
              classes={classes || []}
              importedEvents={events}
              subjectById={subjectById}
              onSelectClass={openEdit}
              tasks={tasks || []}
            />
          )}
        </>
      )}

      <ClassFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editingClass={editingClass} />
    </Page>
  );
}
