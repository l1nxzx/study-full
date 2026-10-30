import { Trash2 } from "lucide-react";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTypeIcon } from "@/components/tasks/TaskTypeIcon";
import { formatDayShort } from "@/lib/date";
import { EXAM_KIND_LABELS } from "@/lib/taskMeta";
import { cn } from "@/lib/utils";
import type { Subject, Task } from "@/types";

interface TaskItemProps {
  task: Task;
  subject?: Subject;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
  overdue?: boolean;
  /** Hide the due date when the surrounding group already states it ("Tomorrow"). */
  hideDate?: boolean;
}

// A flat list row: checkbox, the task, what kind and which subject, and when it's due.
// Clicking the title opens it for editing.
export function TaskItem({ task, subject, onToggle, onDelete, overdue, hideDate }: TaskItemProps) {
  const typeLabel = task.type === "exam" && task.examKind ? EXAM_KIND_LABELS[task.examKind] : "Homework";
  const late = overdue && !task.completed;

  return (
    <div className="group flex items-start gap-3 py-3">
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className="mt-[3px]"
      />

      <TaskFormDialog
        editingTask={task}
        trigger={
          <button type="button" className="min-w-0 flex-1 text-left transition-opacity active:opacity-60">
            <span className={cn("block text-[0.9375rem] leading-snug", task.completed ? "text-fg-faint line-through" : "text-fg group-hover:text-fg")}>
              {task.title}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-meta text-fg-muted">
              <TaskTypeIcon task={task} size="sm" />
              <span className="shrink-0">{typeLabel}</span>
              {subject && (
                <>
                  <span aria-hidden className="text-fg-faint">·</span>
                  <SubjectLabel name={subject.name} color={subject.color} />
                </>
              )}
            </span>
          </button>
        }
      />

      {!hideDate && task.dueDate && (
        <span className={cn("shrink-0 pt-0.5 text-[0.8125rem] tabular", late ? "text-bad" : "text-fg-muted")}>{formatDayShort(task.dueDate)}</span>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${task.title}"`}
        title="Delete"
        className="-my-1 flex size-8 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-bad/10 hover:text-bad lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
