import { BookOpen, ClipboardCheck, FileText, Mic, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamKind, Task } from "@/types";

interface TypeMeta {
  color: string;
  icon: LucideIcon;
}

// One muted colour per kind (see --kind-* in index.css): enough to tell homework from a unit
// test from a big exam at a glance, without turning a list of exams into a wall of alarms.
const HOMEWORK_META: TypeMeta = { color: "var(--kind-homework)", icon: BookOpen };

const EXAM_META: Record<ExamKind, TypeMeta> = {
  oral: { color: "var(--kind-oral)", icon: Mic },
  quiz: { color: "var(--kind-test)", icon: ClipboardCheck },
  major: { color: "var(--kind-exam)", icon: FileText },
};

export function taskTypeMeta(task: Pick<Task, "type" | "examKind">): TypeMeta {
  if (task.type === "exam" && task.examKind) return EXAM_META[task.examKind];
  return HOMEWORK_META;
}

export function taskTypeColor(task: Pick<Task, "type" | "examKind">): string {
  return taskTypeMeta(task).color;
}

interface TaskTypeIconProps {
  task: Pick<Task, "type" | "examKind">;
  size?: "sm" | "md";
  className?: string;
}

export function TaskTypeIcon({ task, size = "md", className }: TaskTypeIconProps) {
  const meta = taskTypeMeta(task);
  const Icon = meta.icon;
  return <Icon aria-hidden className={cn("shrink-0", size === "sm" ? "size-3.5" : "size-4", className)} style={{ color: meta.color }} strokeWidth={2} />;
}
