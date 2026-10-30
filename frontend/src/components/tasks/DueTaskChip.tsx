import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskTypeIcon } from "@/components/tasks/TaskTypeIcon";
import { EXAM_KIND_LABELS } from "@/lib/taskMeta";
import type { Subject, Task } from "@/types";

interface DueTaskChipProps {
  task: Task;
  subject?: Subject;
}

// A compact, clickable line for a task/exam due on a given day - used to surface
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
          className="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-rule px-2.5 text-[0.8125rem] text-fg transition-colors hover:border-rule-strong hover:bg-tint/60"
        >
          <TaskTypeIcon task={task} size="sm" />
          <span className="truncate">{task.title}</span>
          {isExam && task.examKind && <span className="shrink-0 text-fg-muted">{EXAM_KIND_LABELS[task.examKind]}</span>}
          {subject && <SubjectSwatch color={subject.color} />}
        </button>
      }
    />
  );
}
