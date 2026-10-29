import { formatTime } from "@/lib/date";
import { WEEKDAY_LABELS_FULL } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { ClassEntity, Subject } from "@/types";

interface ClassCardProps {
  classItem: ClassEntity;
  subject?: Subject;
  onClick?: () => void;
  variant?: "block" | "row";
  showWeekday?: boolean;
  className?: string;
}

export function ClassCard({ classItem, subject, onClick, variant = "block", showWeekday, className }: ClassCardProps) {
  const color = subject?.color || "#64748b";

  if (variant === "row") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40",
          className
        )}
      >
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{subject?.name || "Class"}</p>
          <p className="text-xs text-muted-foreground">
            {showWeekday ? `${WEEKDAY_LABELS_FULL[classItem.weekday]} · ` : ""}
            {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
            {classItem.room ? ` · Room ${classItem.room}` : ""}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: `${color}1a`, borderColor: `${color}55` }}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md border px-2 py-1 text-left transition-opacity hover:opacity-80",
        className
      )}
    >
      <span className="truncate text-[11px] font-semibold leading-tight" style={{ color }}>
        {subject?.name || "Class"}
      </span>
      <span className="truncate text-[10px] leading-tight text-muted-foreground">
        {formatTime(classItem.startTime)}
        {classItem.room ? ` · ${classItem.room}` : ""}
      </span>
    </button>
  );
}
