import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTypeIcon } from "@/components/tasks/TaskTypeIcon";
import { formatDateShort, formatWeekdayAbbrev } from "@/lib/date";
import { EXAM_KIND_LABELS } from "@/lib/taskMeta";
import { cn } from "@/lib/utils";
import type { Subject, Task } from "@/types";

interface TaskItemProps {
  task: Task;
  subject?: Subject;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
  overdue?: boolean;
}

// A flat, dense list row - deliberately not a bordered/shadowed card. Modeled after a
// real school-software list (EduPage) rather than a generic soft "AI app" card: a
// weekday/date column, a solid color-coded type icon, then a compact meta+title block.
export function TaskItem({ task, subject, onToggle, onDelete, overdue }: TaskItemProps) {
  const typeLabel = task.type === "exam" && task.examKind ? EXAM_KIND_LABELS[task.examKind] : "Homework";

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex w-11 shrink-0 flex-col items-center leading-none">
        {task.dueDate ? (
          <>
            <span className={cn("text-[10px] font-semibold", overdue && !task.completed ? "text-destructive" : "text-muted-foreground")}>
              {formatWeekdayAbbrev(task.dueDate)}
            </span>
            <span className={cn("mt-1 text-xs", overdue && !task.completed ? "text-destructive font-medium" : "text-muted-foreground")}>
              {formatDateShort(task.dueDate)}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <Checkbox checked={task.completed} onCheckedChange={(checked) => onToggle(checked === true)} />
      <TaskTypeIcon task={task} />

      <TaskFormDialog
        editingTask={task}
        trigger={
          <button type="button" className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs text-muted-foreground">
              {typeLabel}
              {subject && ` · ${subject.name}`}
            </p>
            <p className={cn("truncate text-sm font-semibold", task.completed ? "text-muted-foreground line-through" : "text-foreground")}>
              {task.title}
            </p>
          </button>
        }
      />

      <button onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
