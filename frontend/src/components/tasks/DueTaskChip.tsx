import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTypeIcon } from "@/components/tasks/TaskTypeIcon";
import { EXAM_KIND_LABELS } from "@/lib/taskMeta";
import type { Subject, Task } from "@/types";

interface DueTaskChipProps {
  task: Task;
  subject?: Subject;
}

// A compact, clickable pill for a task/exam due on a given day - used to surface
// schoolwork alongside classes in the Schedule views without forcing it into the
// period/time grid (most homework and exams don't have a fixed class-period time).
export function DueTaskChip({ task, subject }: DueTaskChipProps) {
  const isExam = task.type === "exam";

  return (
    <TaskFormDialog
      editingTask={task}
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          <TaskTypeIcon task={task} size="sm" />
          <span className="max-w-40 truncate">{task.title}</span>
          {subject && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color || "#64748b" }} />}
          {isExam && task.examKind && <span className="text-muted-foreground">· {EXAM_KIND_LABELS[task.examKind]}</span>}
        </button>
      }
    />
  );
}
