import { Plus } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { NoteRow } from "@/components/notes/NoteRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassSession } from "@/hooks/useClassSessions";
import { useSubject } from "@/hooks/useSubjects";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { formatDateLong } from "@/lib/date";

export function ClassSessionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading } = useClassSession(id);
  const { data: subject } = useSubject(session?.subjectId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-3 h-3 w-32" />
        <div className="mt-12 space-y-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Page>
    );
  }

  if (!session) {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <Page>
      <PageHeader
        title={session.title || subject?.name || "Class session"}
        description={`${subject && session.title ? `${subject.name} · ` : ""}${formatDateLong(session.date)}`}
        actions={
          <Button asChild>
            <Link to={`/notes/new?subjectId=${session.subjectId}&sessionId=${session.id}&date=${session.date}`}>
              <Plus /> New note
            </Link>
          </Button>
        }
      />

      <div className="space-y-12">
        <Section title="Notes">
          {session.notes.length === 0 ? (
            <EmptyState title="No notes for this lesson yet" description="Notes you add from here are linked to this lesson and its date." />
          ) : (
            <div className="divide-y divide-rule">
              {session.notes.map((note) => (
                <NoteRow key={note.id} note={note} subject={subject} showSubject={false} />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Tasks"
          action={
            <TaskFormDialog
              defaultSubjectId={session.subjectId}
              defaultSessionId={session.id}
              trigger={
                <Button variant="ghost" size="sm" className="-mr-2.5">
                  <Plus /> Add task
                </Button>
              }
            />
          }
        >
          {session.tasks.length === 0 ? (
            <p className="py-4 text-sm text-fg-faint">No tasks linked to this lesson.</p>
          ) : (
            <div className="divide-y divide-rule">
              {session.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  subject={subject}
                  onToggle={(completed) => updateTask.mutate({ id: task.id, input: { completed } })}
                  onDelete={() => deleteTask.mutate(task.id)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
