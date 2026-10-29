import { format } from "date-fns";
import { ArrowRight, CalendarClock, NotebookText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NextClassCard } from "@/components/dashboard/NextClassCard";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClasses } from "@/hooks/useClasses";
import { useNotes } from "@/hooks/useNotes";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { addDaysISO, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, getUpcomingOccurrences, occurrencesForDate } from "@/lib/scheduleOccurrence";
import { bucketUpNext } from "@/lib/taskGroups";
import type { Subject, Task } from "@/types";

const FETCH_FROM = addDaysISO(todayISO(), -3);
const FETCH_TO = addDaysISO(todayISO(), 30);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function TaskMiniList({
  tasks,
  subjectById,
  overdue,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  subjectById: Map<string, Subject>;
  overdue?: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subject={task.subjectId ? subjectById.get(task.subjectId) : undefined}
          overdue={overdue}
          onToggle={(completed) => onToggle(task.id, completed)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: importedEvents } = useScheduleEvents(FETCH_FROM, FETCH_TO);
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));
  const events = importedEvents || [];
  const classList = classes || [];

  const today = todayISO();
  const todayOccurrences = occurrencesForDate(today, weekdayOf(today), events, classList, subjectById);
  const anchorDate = computeDefaultAnchorDate(todayOccurrences, now);

  const upcoming = getUpcomingOccurrences(classList, events, subjectById, 1, now);
  const nextOccurrence = upcoming[0];

  const scheduleLoading = classesLoading;
  const displayName = user?.name || user?.email?.split("@")[0] || "";

  const { overdue, tomorrow, today: dueToday } = bucketUpNext(tasks || []);
  const recentNotes = (notes || []).slice(0, 4);

  function handleToggle(id: string, completed: boolean) {
    updateTask.mutate({ id, input: { completed } });
  }
  function handleDelete(id: string) {
    deleteTask.mutate(id);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting()}
          {displayName ? `, ${displayName}` : ""}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {scheduleLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card>
              <CardContent className="pt-5">
                <DayCardRow
                  date={anchorDate}
                  classes={classList}
                  importedEvents={events}
                  subjectById={subjectById}
                  now={now}
                  showStatus
                  tasks={tasks || []}
                />
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          {scheduleLoading ? <Skeleton className="h-32 w-full" /> : <NextClassCard occurrence={nextOccurrence} />}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Up Next</h2>
          <Link to="/tasks" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {tasksLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">Overdue · clear these first</p>
                <TaskMiniList tasks={overdue} subjectById={subjectById} overdue onToggle={handleToggle} onDelete={handleDelete} />
              </div>
            )}

            <div className="border-l-2 border-primary pl-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <CalendarClock className="size-3.5" /> Prepare for tomorrow
              </p>
              {tomorrow.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Nothing due tomorrow yet.</p>
              ) : (
                <TaskMiniList tasks={tomorrow} subjectById={subjectById} onToggle={handleToggle} onDelete={handleDelete} />
              )}
            </div>

            {dueToday.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due today</p>
                <TaskMiniList tasks={dueToday} subjectById={subjectById} onToggle={handleToggle} onDelete={handleDelete} />
              </div>
            )}

            {overdue.length === 0 && tomorrow.length === 0 && dueToday.length === 0 && (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up for the next couple of days.</p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Notes</h2>
          <Link to="/notes" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        {notesLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : recentNotes.length === 0 ? (
          <EmptyState icon={NotebookText} title="No notes yet" description="Add your first class notes to start building your study library." />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} subject={subjectById.get(note.subjectId)} />
            ))}
          </div>
        )}
      </div>

      {!scheduleLoading && classList.length === 0 && events.length === 0 && (
        <div>
          <Button asChild variant="outline" size="sm">
            <Link to="/schedule">Set up your weekly schedule</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
