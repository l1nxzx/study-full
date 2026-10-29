import { CalendarDays, NotebookText, Pencil, Plus } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ClassCard } from "@/components/schedule/ClassCard";
import { ClassSessionFormDialog } from "@/components/schedule/ClassSessionFormDialog";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubject } from "@/hooks/useSubjects";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { formatDateShort } from "@/lib/date";

export function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: subject, isLoading } = useSubject(id);
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

  if (!subject) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {subject.icon && <span className="text-2xl leading-none">{subject.icon}</span>}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">
              {subject.noteCount} {subject.noteCount === 1 ? "note" : "notes"}
            </p>
          </div>
        </div>
        <SubjectFormDialog
          editingSubject={subject}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil /> Edit
            </Button>
          }
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Schedule</h2>
        </div>
        {subject.schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weekly classes set for this subject yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subject.schedule.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} subject={subject} variant="row" showWeekday />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Notes</h2>
          <Button asChild size="sm">
            <Link to={`/notes/new?subjectId=${subject.id}`}>
              <Plus /> Add Note
            </Link>
          </Button>
        </div>
        {subject.recentNotes.length === 0 ? (
          <EmptyState icon={NotebookText} title="No notes yet" description="Add notes for this subject to see them here." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subject.recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} subject={subject} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Class Sessions</h2>
          <ClassSessionFormDialog subjectId={subject.id} />
        </div>
        {subject.recentSessions.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No sessions yet" description="Log a class session to attach notes and tasks to a specific date." />
        ) : (
          <div className="space-y-2">
            {subject.recentSessions.map((session) => (
              <Link
                key={session.id}
                to={`/class-sessions/${session.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
              >
                <span className="font-medium text-foreground">{session.title || formatDateShort(session.date)}</span>
                <span className="text-xs text-muted-foreground">{formatDateShort(session.date)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Upcoming Tasks</h2>
          <TaskFormDialog
            defaultSubjectId={subject.id}
            trigger={
              <Button size="sm">
                <Plus /> Add Task
              </Button>
            }
          />
        </div>
        {subject.upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks for this subject.</p>
        ) : (
          <div className="space-y-2">
            {subject.upcomingTasks.map((task) => (
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
