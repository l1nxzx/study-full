import { Backpack, FileText, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExamKind, Task } from "@/types";

interface TypeMeta {
  bg: string;
  fg: string;
  icon: LucideIcon;
}

const HOMEWORK_META: TypeMeta = { bg: "#2563eb", fg: "#ffffff", icon: Backpack };

// Fixed, non-theme-adaptive accent per type/kind (same approach as the Subject color
// palette) - these are identity colors, not semantic status colors, so they stay the
// same in light and dark mode.
const EXAM_META: Record<ExamKind, TypeMeta> = {
  oral: { bg: "#ddd6fe", fg: "#6d28d9", icon: Users }, // pastel purple
  quiz: { bg: "#facc15", fg: "#713f12", icon: FileText }, // bright yellow ("Unit Test")
  major: { bg: "#f97316", fg: "#ffffff", icon: FileText }, // red-orange ("Big exam")
};

export function taskTypeMeta(task: Pick<Task, "type" | "examKind">): TypeMeta {
  if (task.type === "exam" && task.examKind) return EXAM_META[task.examKind];
  return HOMEWORK_META;
}

export function examKindMeta(kind: ExamKind): TypeMeta {
  return EXAM_META[kind];
}

export function taskTypeColor(task: Pick<Task, "type" | "examKind">): string {
  return taskTypeMeta(task).bg;
}

interface TaskTypeIconProps {
  task: Pick<Task, "type" | "examKind">;
  size?: "sm" | "md";
  className?: string;
}

export function TaskTypeIcon({ task, size = "md", className }: TaskTypeIconProps) {
  const meta = taskTypeMeta(task);
  const Icon = meta.icon;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", size === "sm" ? "size-5" : "size-8", className)}
      style={{ backgroundColor: meta.bg }}
    >
      <Icon className={size === "sm" ? "size-3" : "size-4"} style={{ color: meta.fg }} />
    </span>
  );
}
