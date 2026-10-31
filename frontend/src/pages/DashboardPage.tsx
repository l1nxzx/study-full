import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import * as statsApi from "@/api/stats";
import * as testsApi from "@/api/tests";
import { Page, Section, SectionLink } from "@/components/layout/PageHeader";
import { DayCardRow } from "@/components/schedule/DayCardRow";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { BarChart } from "@/components/stats/Charts";
import { formatStudyTime } from "@/components/stats/format";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClasses } from "@/hooks/useClasses";
import { useNotes } from "@/hooks/useNotes";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { addDaysISO, formatDateShort, formatDayShort, formatTime, todayISO, weekdayOf } from "@/lib/date";
import { computeDefaultAnchorDate, getUpcomingOccurrences, occurrencesForDate } from "@/lib/scheduleOccurrence";
import { testTitle } from "@/lib/testLabels";
import { cn } from "@/lib/utils";
import type { Subject, Task } from "@/types";
import { FRESHNESS } from "@/lib/freshness";
import { overviewWithStudy, useStudyOverlay } from "@/lib/statsOverlay";

const FETCH_FROM = addDaysISO(todayISO(), -3);
const FETCH_TO = addDaysISO(todayISO(), 30);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A quiet one-line state ("nothing here") in a single text style. */
function Quiet({ children }: { children: ReactNode }) {
  return <p className="py-3 text-sm text-fg-muted">{children}</p>;
}

function SectionSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-3 pt-4" aria-hidden>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i % 2 ? "w-1/2" : "w-2/3")} />
      ))}
    </div>
  );
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

/** A row that takes you back into something: an open test, a note you were studying. */
function ContinueRow({ to, title, detail }: { to: string; title: string; detail: string }) {
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[0.9375rem] font-medium text-fg transition-colors group-hover:text-accent">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-meta text-fg-faint">{detail}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-fg-faint transition-colors group-hover:text-accent" />
      </Link>
    </li>
  );
}

// Orientation first: where you are in the school day, what's due, what you were in the middle
// of, and how much you've studied lately. Each section waits for its own data and shows a
// skeleton meanwhile, so nothing flashes an empty state before the real content arrives.
export function DashboardPage() {
  const { user } = useAuth();
  const { data: classes, isPending: classesPending } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: importedEvents, isPending: eventsPending } = useScheduleEvents(FETCH_FROM, FETCH_TO);
  const { data: notes, isPending: notesPending } = useNotes();
  const { data: tasks, isPending: tasksPending } = useTasks();
  const { data: fetchedStats, isPending: statsPending } = useQuery({ queryKey: ["stats", "overview"], queryFn: statsApi.getOverview, staleTime: FRESHNESS.stats, refetchInterval: FRESHNESS.stats });
  // This device's study time that the server's answer doesn't include yet is added on top.
  const overlay = useStudyOverlay(fetchedStats?.asOf);
  const stats = fetchedStats && overlay ? overviewWithStudy(fetchedStats, overlay) : fetchedStats;
  const { data: tests } = useQuery({ queryKey: ["tests"], queryFn: testsApi.listTests, staleTime: FRESHNESS.tests });
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

  // Schedule: the day to show (today, or the next school day once today's lessons are over).
  const scheduleReady = !classesPending && !eventsPending;
  const noTimetable = scheduleReady && classList.length === 0 && events.length === 0;
  const todayOccurrences = occurrencesForDate(today, weekdayOf(today), events, classList, subjectById);
  const anchorDate = computeDefaultAnchorDate(todayOccurrences, now);
  const anchorOccurrences = occurrencesForDate(anchorDate, weekdayOf(anchorDate), events, classList, subjectById);
  const nextOccurrence = getUpcomingOccurrences(classList, events, subjectById, 1, now)[0];

  // Tasks: overdue, today, tomorrow and the rest of the week; otherwise the next one further out.
  const open = (tasks || []).filter((t) => !t.completed && t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const tomorrowISO = addDaysISO(today, 1);
  const weekEnd = addDaysISO(today, 7);
  const overdue = open.filter((t) => t.dueDate! < today);
  const dueToday = open.filter((t) => t.dueDate === today);
  const dueTomorrow = open.filter((t) => t.dueDate === tomorrowISO);
  const thisWeek = open.filter((t) => t.dueDate! > tomorrowISO && t.dueDate! <= weekEnd);
  const later = open.find((t) => t.dueDate! > weekEnd);
  const weekCount = overdue.length + dueToday.length + dueTomorrow.length + thisWeek.length;

  // Continue: an unfinished test try, a test still being written, the note you studied last.
  const openTest = tests?.find((t) => t.status === "ready" && t.openAttemptId);
  const writingTest = tests?.find((t) => t.status === "generating");
  const lastNote = stats?.sessions.recent.flatMap((s) => s.notes)[0];
  const continueRows = [
    openTest && { to: `/tests/attempts/${openTest.openAttemptId}`, title: testTitle(openTest), detail: "Test in progress · continue where you stopped" },
    writingTest && { to: `/tests/${writingTest.id}`, title: testTitle(writingTest), detail: "Test being written" },
    lastNote && { to: `/notes/${lastNote.noteId}`, title: lastNote.title, detail: "The note you studied last" },
  ].filter(Boolean) as { to: string; title: string; detail: string }[];

  const recentNotes = (notes || []).slice(0, 5);
  const last7 = stats?.time.days.slice(-7) ?? [];

  // One line that sums up the day, once everything it mentions has loaded.
  const summaryParts: string[] = [];
  if (scheduleReady && !noTimetable) {
    const left = todayOccurrences.length;
    summaryParts.push(left === 0 ? "No classes today" : `${left} ${left === 1 ? "class" : "classes"} today`);
  }
  if (!tasksPending) summaryParts.push(weekCount === 0 ? "nothing due this week" : `${weekCount} due this week`);
  if (stats && stats.time.todaySeconds > 0) summaryParts.push(`${formatStudyTime(stats.time.todaySeconds)} studied today`);
  const summaryReady = scheduleReady && !tasksPending && !statsPending;

  const displayName = user?.name || user?.email?.split("@")[0] || "";
  const handleToggle = (id: string, completed: boolean) => updateTask.mutate({ id, input: { completed } });
  const handleDelete = (id: string) => deleteTask.mutate(id);

  return (
    <Page width="wide">
      <header className="mb-10">
        <p className="text-[0.8125rem] text-fg-muted">{format(now, "EEEE, MMMM d")}</p>
        <h1 className="page-title mt-0.5">
          {greeting()}
          {displayName ? `, ${displayName}` : ""}
        </h1>
        <div className="mt-1.5 h-5">
          {summaryReady ? (
            <p className="text-sm text-fg-muted first-letter:uppercase">{summaryParts.join(" · ")}.</p>
          ) : (
            <Skeleton className="h-3.5 w-60" />
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-12">
          {!scheduleReady ? (
            <div className="space-y-3" aria-hidden>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : noTimetable ? (
            <Section title="Today">
              <Quiet>
                No timetable yet.{" "}
                <Link to="/schedule" className="text-accent underline-offset-4 hover:underline">
                  Add your classes or connect EduPage
                </Link>
              </Quiet>
            </Section>
          ) : anchorOccurrences.length > 0 ? (
            <DayCardRow
              date={anchorDate}
              classes={classList}
              importedEvents={events}
              subjectById={subjectById}
              now={now}
              showStatus
              tasks={tasks || []}
            />
          ) : (
            <Section title="Today" action={<SectionLink to="/schedule">Schedule</SectionLink>}>
              <Quiet>
                No classes today.
                {nextOccurrence && (
                  <>
                    {" "}
                    Next: <span className="text-fg">{nextOccurrence.title}</span>, {formatDayShort(nextOccurrence.date)} at {formatTime(nextOccurrence.startTime)}.
                  </>
                )}
              </Quiet>
            </Section>
          )}

          <Section title="Up next" action={<SectionLink to="/tasks">All tasks</SectionLink>}>
            {tasksPending ? (
              <SectionSkeleton />
            ) : weekCount === 0 ? (
              <Quiet>
                Nothing due this week.
                {later ? (
                  <>
                    {" "}
                    Next: <span className="text-fg">{later.title}</span>, {formatDateShort(later.dueDate!)}.
                  </>
                ) : (
                  <>
                    {" "}
                    <Link to="/tasks" className="text-accent underline-offset-4 hover:underline">
                      Add a task
                    </Link>
                  </>
                )}
              </Quiet>
            ) : (
              <div>
                {overdue.length > 0 && (
                  <TaskGroup label="Overdue" tone="bad" tasks={overdue} subjectById={subjectById} overdue onToggle={handleToggle} onDelete={handleDelete} />
                )}
                {dueToday.length > 0 && (
                  <TaskGroup label="Due today" tasks={dueToday} subjectById={subjectById} hideDate onToggle={handleToggle} onDelete={handleDelete} />
                )}
                {dueTomorrow.length > 0 && (
                  <TaskGroup label="Prepare for tomorrow" tone="accent" tasks={dueTomorrow} subjectById={subjectById} hideDate onToggle={handleToggle} onDelete={handleDelete} />
                )}
                {thisWeek.length > 0 && (
                  <TaskGroup label="Later this week" tasks={thisWeek} subjectById={subjectById} onToggle={handleToggle} onDelete={handleDelete} />
                )}
              </div>
            )}
          </Section>

          {continueRows.length > 0 && (
            <Section title="Continue">
              <ul className="divide-y divide-rule">
                {continueRows.map((row) => (
                  <ContinueRow key={row.to} {...row} />
                ))}
              </ul>
            </Section>
          )}

          <Section title="Your week" action={<SectionLink to="/profile">Statistics</SectionLink>}>
            {statsPending ? (
              <SectionSkeleton lines={3} />
            ) : !stats || stats.time.totalSeconds === 0 ? (
              <Quiet>Study time appears here once you read notes, use the assistant or take quizzes and tests.</Quiet>
            ) : (
              <div className="grid grid-cols-1 gap-x-10 gap-y-6 pt-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <dl className="grid grid-cols-3 gap-4">
                  {[
                    ["Today", formatStudyTime(stats.time.todaySeconds)],
                    ["Last 7 days", formatStudyTime(stats.time.last7Seconds)],
                    ["Tests", stats.tests.averagePercent === null ? "–" : `${Math.round(stats.tests.averagePercent)}% avg`],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-meta text-fg-faint">{label}</dt>
                      <dd className="mt-0.5 text-base font-semibold leading-tight text-fg tabular">{value}</dd>
                    </div>
                  ))}
                </dl>
                <BarChart
                  height={56}
                  data={last7.map((d) => ({
                    key: d.date,
                    label: format(parseISO(d.date), "EEEEE"),
                    title: format(parseISO(d.date), "EEEE, MMMM d"),
                    value: d.seconds,
                    valueLabel: formatStudyTime(d.seconds),
                    highlight: d.date === today,
                  }))}
                />
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-10">
          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="group-label">Recent notes</h2>
              <SectionLink to="/notes">All notes</SectionLink>
            </div>
            {notesPending ? (
              <SectionSkeleton lines={3} />
            ) : recentNotes.length === 0 ? (
              <Quiet>
                No notes yet.{" "}
                <Link to="/notes/new" className="text-accent underline-offset-4 hover:underline">
                  Add your first
                </Link>
              </Quiet>
            ) : (
              <ul className="divide-y divide-rule">
                {recentNotes.map((note) => {
                  const subject = (note.subjectId ? subjectById.get(note.subjectId) : undefined);
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

          {stats && stats.tests.recent.length > 0 && (
            <section>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="group-label">Recent tests</h2>
                <SectionLink to="/tests">All tests</SectionLink>
              </div>
              <ul className="divide-y divide-rule">
                {stats.tests.recent.slice(0, 3).map((t) => (
                  <li key={t.attemptId}>
                    <Link to={`/tests/attempts/${t.attemptId}`} className="group flex items-baseline justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-fg group-hover:text-accent">{t.title}</span>
                        <span className="block text-meta text-fg-faint">{formatDistanceToNow(parseISO(t.gradedAt), { addSuffix: true })}</span>
                      </span>
                      <span className={cn("shrink-0 text-sm tabular", t.percent >= 85 ? "text-ok" : t.percent >= 50 ? "text-fg" : "text-bad")}>
                        {Math.round(t.percent)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}
