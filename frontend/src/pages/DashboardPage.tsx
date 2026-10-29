import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NextClassCard } from "@/components/dashboard/NextClassCard";
import { Page, Section, SectionLink } from "@/components/layout/PageHeader";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClasses } from "@/hooks/useClasses";
import { useNotes } from "@/hooks/useNotes";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { addDaysISO, formatDateShort, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, getUpcomingOccurrences, occurrencesForDate } from "@/lib/scheduleOccurrence";
import { bucketUpNext } from "@/lib/taskGroups";
import { cn } from "@/lib/utils";
import type { Subject, Task } from "@/types";

const FETCH_FROM = addDaysISO(todayISO(), -3);
const FETCH_TO = addDaysISO(todayISO(), 30);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function TaskGroup({
  label,
  tone,
  tasks,
  subjectById,
  overdue,
  hideDate,
  onToggle,
  onDelete,
}: {
  label: string;
  tone?: "bad" | "accent";
  tasks: Task[];
  subjectById: Map<string, Subject>;
  overdue?: boolean;
  hideDate?: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <p className={cn("group-label pt-4", tone === "bad" && "text-bad", tone === "accent" && "text-accent")}>{label}</p>
      <div className="divide-y divide-rule">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            subject={task.subjectId ? subjectById.get(task.subjectId) : undefined}
            overdue={overdue}
            hideDate={hideDate}
            onToggle={(completed) => onToggle(task.id, completed)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Orientation, not statistics: where you are in the school day, what needs doing before
// tomorrow, and the notes you were last working on.
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
  const recentNotes = (notes || []).slice(0, 5);
  const noTimetable = !scheduleLoading && classList.length === 0 && events.length === 0;

  function handleToggle(id: string, completed: boolean) {
    updateTask.mutate({ id, input: { completed } });
  }
  function handleDelete(id: string) {
    deleteTask.mutate(id);
  }

  return (
    <Page width="wide">
      <header className="mb-10">
        <p className="text-[0.8125rem] text-fg-muted">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="page-title mt-0.5">
          {greeting()}
          {displayName ? `, ${displayName}` : ""}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-12">
          {scheduleLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : noTimetable ? (
            <EmptyState
              title="No timetable yet"
              description="Add your classes or connect EduPage, and this page will show where you are in the school day."
              action={
                <Link to="/schedule" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
                  Set up your timetable
                </Link>
              }
              className="py-0"
            />
          ) : (
            <DayCardRow
              date={anchorDate}
              classes={classList}
              importedEvents={events}
              subjectById={subjectById}
              now={now}
              showStatus
              tasks={tasks || []}
            />
          )}

          <Section title="Up next" action={<SectionLink to="/tasks">All tasks</SectionLink>}>
            {tasksLoading ? (
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div>
                {overdue.length > 0 && (
                  <TaskGroup
                    label="Overdue"
                    tone="bad"
                    tasks={overdue}
                    subjectById={subjectById}
                    overdue
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                )}
                <TaskGroup
                  label="Prepare for tomorrow"
                  tone="accent"
                  tasks={tomorrow}
                  subjectById={subjectById}
                  hideDate
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
                {tomorrow.length === 0 && <p className="py-2 text-sm text-fg-faint">Nothing due tomorrow yet.</p>}
                {dueToday.length > 0 && (
                  <TaskGroup
                    label="Due today"
                    tasks={dueToday}
                    subjectById={subjectById}
                    hideDate
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                )}
                {overdue.length === 0 && tomorrow.length === 0 && dueToday.length === 0 && (
                  <p className="text-sm text-fg-muted">You're caught up for the next couple of days.</p>
                )}
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-10">
          {scheduleLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            !noTimetable && <NextClassCard occurrence={nextOccurrence} />
          )}

          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="group-label">Recent notes</h2>
              <SectionLink to="/notes">All notes</SectionLink>
            </div>
            {notesLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : recentNotes.length === 0 ? (
              <p className="py-2 text-sm text-fg-faint">
                No notes yet.{" "}
                <Link to="/notes/new" className="text-accent underline-offset-4 hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {recentNotes.map((note) => {
                  const subject = subjectById.get(note.subjectId);
                  return (
                    <li key={note.id}>
                      <Link to={`/notes/${note.id}`} className="group block py-2.5">
                        <span className="block truncate font-serif text-[0.9375rem] font-medium text-fg transition-colors group-hover:text-accent">
                          {note.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-meta text-fg-faint">
                          {subject && <SubjectSwatch color={subject.color} />}
                          <span className="truncate">{subject?.name}</span>
                          <span aria-hidden>·</span>
                          <span className="shrink-0 tabular">{formatDateShort(note.date)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </Page>
  );
}
