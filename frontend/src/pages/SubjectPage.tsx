import { Pencil, Plus } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { NoteRow } from "@/components/notes/NoteRow";
import { ClassCard } from "@/components/schedule/ClassCard";
import { ClassSessionFormDialog } from "@/components/schedule/ClassSessionFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { SubjectStatsSection } from "@/components/stats/EntityStats";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubject } from "@/hooks/useSubjects";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { formatDayShort } from "@/lib/date";

export function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: subject, isLoading } = useSubject(id);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (isLoading) {
    return (
      <Page width="wide">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-3 w-32" />
        <div className="mt-12 space-y-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </Page>
    );
  }

  if (!subject) {
    return <Navigate to="/dashboard" replace />;
  }

  const sortedSchedule = [...subject.schedule].sort(
    (a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime)
  );

  return (
    <Page width="wide">
      <PageHeader
        title={
          <h1 className="page-title flex items-center gap-3">
            {subject.icon ? <span className="text-xl leading-none">{subject.icon}</span> : <SubjectSwatch color={subject.color} className="size-3" />}
            {subject.name}
          </h1>
        }
        description={`${subject.noteCount} ${subject.noteCount === 1 ? "note" : "notes"} · ${subject.upcomingTasks.length} open ${
          subject.upcomingTasks.length === 1 ? "task" : "tasks"
        }`}
        actions={
          <>
            <SubjectFormDialog
              editingSubject={subject}
              trigger={
                <Button variant="ghost" size="sm">
                  <Pencil /> Edit subject
                </Button>
              }
            />
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/tests/new?subjectId=${subject.id}`}>Make a test</Link>
            </Button>
            <Button asChild>
              <Link to={`/notes/new?subjectId=${subject.id}`}>
                <Plus /> New note
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-12">
          <Section title="Notes" description={subject.noteCount > subject.recentNotes.length ? "Most recent" : undefined}>
            {subject.recentNotes.length === 0 ? (
              <EmptyState
                title="No notes for this subject yet"
                description="Notes you add here can be quizzed, turned into flashcards and asked about with the assistant."
              />
            ) : (
              <div className="divide-y divide-rule">
                {subject.recentNotes.map((note) => (
                  <NoteRow key={note.id} note={note} subject={subject} showSubject={false} />
                ))}
              </div>
            )}
            {subject.noteCount > subject.recentNotes.length && (
              <Link to="/notes" className="mt-2 inline-block text-[0.8125rem] text-fg-muted hover:text-accent">
                See all {subject.noteCount} notes
              </Link>
            )}
          </Section>

          <Section
            title="Open tasks"
            action={
              <TaskFormDialog
                defaultSubjectId={subject.id}
                trigger={
                  <Button variant="ghost" size="sm" className="-mr-2.5">
                    <Plus /> Add task
                  </Button>
                }
              />
            }
          >
            {subject.upcomingTasks.length === 0 ? (
              <p className="py-4 text-sm text-fg-faint">Nothing open for this subject.</p>
            ) : (
              <div className="divide-y divide-rule">
                {subject.upcomingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={(completed) => updateTask.mutate({ id: task.id, input: { completed } })}
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-10">
          <SubjectStatsSection subjectId={subject.id} />

          <section>
            <h2 className="group-label border-b border-rule pb-2">Weekly classes</h2>
            {sortedSchedule.length === 0 ? (
              <p className="py-3 text-sm text-fg-faint">No weekly classes set.</p>
            ) : (
              <div className="divide-y divide-rule">
                {sortedSchedule.map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} subject={subject} showWeekday />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-rule pb-1">
              <h2 className="group-label pb-1">Class sessions</h2>
              <div className="-mr-2.5">
                <ClassSessionFormDialog subjectId={subject.id} />
              </div>
            </div>
            {subject.recentSessions.length === 0 ? (
              <p className="py-3 text-sm leading-relaxed text-fg-faint">Log a lesson to attach notes and tasks to a specific date.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {subject.recentSessions.map((session) => (
                  <li key={session.id}>
                    <Link to={`/class-sessions/${session.id}`} className="group flex items-baseline justify-between gap-3 py-2.5 text-sm">
                      <span className="truncate text-fg transition-colors group-hover:text-accent">{session.title || "Lesson"}</span>
                      <span className="shrink-0 text-meta text-fg-faint tabular">{formatDayShort(session.date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </Page>
  );
}
