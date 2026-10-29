import { ArrowLeft, NotebookText, Plus } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { NoteCard } from "@/components/notes/NoteCard";
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to={subject ? `/subjects/${subject.id}` : "/schedule"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {subject?.name || "Schedule"}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{session.title || subject?.name || "Class session"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(session.date)}</p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Notes</h2>
          <Button asChild size="sm">
            <Link to={`/notes/new?subjectId=${session.subjectId}&sessionId=${session.id}&date=${session.date}`}>
              <Plus /> Add Note
            </Link>
          </Button>
        </div>
        {session.notes.length === 0 ? (
          <EmptyState icon={NotebookText} title="No notes for this session" description="Add your cleaned-up notes from this class." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {session.notes.map((note) => (
              <NoteCard key={note.id} note={note} subject={subject} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
          <TaskFormDialog
            defaultSubjectId={session.subjectId}
            defaultSessionId={session.id}
            trigger={
              <Button size="sm">
                <Plus /> Add Task
              </Button>
            }
          />
        </div>
        {session.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks linked to this session.</p>
        ) : (
          <div className="space-y-2">
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
      </div>
    </div>
  );
}
