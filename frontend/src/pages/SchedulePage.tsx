import { CalendarDays, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClassFormDialog } from "@/components/schedule/ClassFormDialog";
import { ScheduleDayView } from "@/components/schedule/ScheduleDayView";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { ScheduleSyncStatus } from "@/components/schedule/ScheduleSyncStatus";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClasses } from "@/hooks/useClasses";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useTasks } from "@/hooks/useTasks";
import { addDaysISO, mondayOfWeek, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, occurrencesForDate } from "@/lib/scheduleOccurrence";
import type { ClassEntity } from "@/types";

// A fixed, generous fetch window rather than refetching on every day/week navigation -
// plenty for how far a student actually browses their own schedule.
const FETCH_FROM = addDaysISO(todayISO(), -14);
const FETCH_TO = addDaysISO(todayISO(), 60);

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

  function openNew() {
    setEditingClass(null);
    setDialogOpen(true);
  }

  function openEdit(classItem: ClassEntity) {
    setEditingClass(classItem);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Your weekly timetable, at a glance."
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={openNew}>
              <Plus /> Add Class
            </Button>
          </div>
        }
      />

      <ScheduleSyncStatus />

      {isLoading && <Skeleton className="h-96 w-full" />}

      {!isLoading && !hasAnySchedule && (
        <EmptyState
          icon={CalendarDays}
          title="No classes scheduled"
          description="Add your recurring classes, or connect your EduPage calendar in Settings, to build your timetable."
          action={
            <Button onClick={openNew}>
              <Plus /> Add Class
            </Button>
          }
        />
      )}

      {!isLoading &&
        hasAnySchedule &&
        (view === "day" ? (
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
            weekStartDate={mondayOfWeek(anchorDate)}
            classes={classes || []}
            importedEvents={events}
            subjectById={subjectById}
            onSelectClass={openEdit}
            tasks={tasks || []}
          />
        ))}

      <ClassFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editingClass={editingClass} />
    </div>
  );
}
