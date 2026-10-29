import { formatTime, minutesSinceMidnight } from "@/lib/date";
import type { OccurrenceTimeState, ScheduleOccurrence } from "@/lib/scheduleOccurrence";
import { cn } from "@/lib/utils";

interface PeriodCardProps {
  occurrence: ScheduleOccurrence;
  periodNumber: number;
  timeState?: OccurrenceTimeState;
  nowMinutes?: number;
  onClick?: () => void;
}

// One lesson period, styled after an actual school timetable (EduPage) rather than a
// generic modern card: square corners, plain (uncolored) subject text with the subject's
// color shown only as a small dot, and no decoration at all for a normal scheduled
// lesson - color only appears when something is actually different (changed/cancelled).
export function PeriodCard({ occurrence, periodNumber, timeState, nowMinutes, onClick }: PeriodCardProps) {
  const cancelled = occurrence.status === "cancelled";
  const changed = occurrence.status === "changed";
  const isNow = timeState === "now" && !cancelled;
  const isPast = timeState === "past";

  const start = minutesSinceMidnight(occurrence.startTime);
  const end = minutesSinceMidnight(occurrence.endTime);
  const remaining = isNow && nowMinutes !== undefined ? Math.max(0, end - nowMinutes) : 0;
  const progressPct =
    isNow && nowMinutes !== undefined ? Math.min(100, Math.max(0, ((nowMinutes - start) / Math.max(end - start, 1)) * 100)) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex w-32 shrink-0 flex-col gap-0.5 border-t-[3px] bg-card px-2.5 py-2 text-left",
        changed ? "border-t-warning" : cancelled ? "border-t-destructive" : "border-t-transparent",
        isNow && "bg-accent/50",
        isPast && !isNow && "opacity-50",
        cancelled && "opacity-70",
        onClick && "cursor-pointer hover:bg-muted/60"
      )}
    >
      <span className="text-[11px] text-muted-foreground">{periodNumber}</span>

      <span className="flex items-center gap-1.5">
        <span className={cn("truncate text-base font-bold leading-tight text-foreground", cancelled && "line-through")}>
          {occurrence.title}
        </span>
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: occurrence.color }} />
      </span>

      {occurrence.room && <span className="truncate text-xs text-muted-foreground">Room {occurrence.room}</span>}
      <span className="text-xs text-muted-foreground">
        {formatTime(occurrence.startTime)} - {formatTime(occurrence.endTime)}
      </span>

      {isNow && (
        <div className="mt-1 space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[10px] font-semibold text-foreground">NOW · {remaining} min left</p>
        </div>
      )}
      {timeState === "next" && !cancelled && <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Next</p>}
      {cancelled && <p className="text-[10px] font-bold uppercase tracking-wide text-destructive">Cancelled</p>}
      {changed && <p className="text-[10px] font-bold uppercase tracking-wide text-warning">Changed</p>}
    </div>
  );
}
