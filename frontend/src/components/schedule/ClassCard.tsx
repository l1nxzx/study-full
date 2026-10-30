import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { formatTimeRange } from "@/lib/date";
import { WEEKDAY_LABELS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { ClassEntity, Subject } from "@/types";

interface ClassCardProps {
  classItem: ClassEntity;
  subject?: Subject;
  onClick?: () => void;
  showWeekday?: boolean;
  className?: string;
}

/** A weekly class as a list row: day, time, room. */
export function ClassCard({ classItem, subject, onClick, showWeekday, className }: ClassCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("flex w-full items-baseline gap-3 py-2.5 text-left text-sm", onClick && "transition-colors hover:text-accent", className)}
    >
      {showWeekday ? (
        <span className="w-9 shrink-0 font-medium text-fg">{WEEKDAY_LABELS[classItem.weekday]}</span>
      ) : (
        <SubjectSwatch color={subject?.color} />
      )}
      <span className="flex-1 whitespace-nowrap tabular text-fg-muted">{formatTimeRange(classItem.startTime, classItem.endTime)}</span>
      {classItem.room && <span className="shrink-0 whitespace-nowrap text-meta text-fg-faint">Room {classItem.room}</span>}
    </Comp>
  );
}
