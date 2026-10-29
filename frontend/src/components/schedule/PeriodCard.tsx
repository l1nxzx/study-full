import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { formatTime, formatTimeRange, minutesSinceMidnight } from "@/lib/date";
import type { OccurrenceTimeState, ScheduleOccurrence } from "@/lib/scheduleOccurrence";
import { cn } from "@/lib/utils";

interface PeriodCardProps {
  occurrence: ScheduleOccurrence;
  periodNumber: number;
  timeState?: OccurrenceTimeState;
  nowMinutes?: number;
  onClick?: () => void;
  /** "cell": a column of the horizontal timetable strip. "row": a line in the phone's vertical list. */
  layout?: "cell" | "row";
}

function useOccurrenceState(occurrence: ScheduleOccurrence, timeState?: OccurrenceTimeState, nowMinutes?: number) {
  const cancelled = occurrence.status === "cancelled";
  const changed = occurrence.status === "changed";
  const isNow = timeState === "now" && !cancelled;
  const isNext = timeState === "next" && !cancelled;
  const isPast = timeState === "past";
  const start = minutesSinceMidnight(occurrence.startTime);
  const end = minutesSinceMidnight(occurrence.endTime);
  const remaining = isNow && nowMinutes !== undefined ? Math.max(0, end - nowMinutes) : 0;
  const progressPct =
    isNow && nowMinutes !== undefined ? Math.min(100, Math.max(0, ((nowMinutes - start) / Math.max(end - start, 1)) * 100)) : 0;
  return { cancelled, changed, isNow, isNext, isPast, remaining, progressPct };
}

function StatusText({ state }: { state: ReturnType<typeof useOccurrenceState> }) {
  if (state.cancelled) return <span className="text-bad">Cancelled</span>;
  if (state.changed) return <span className="text-warn">Changed</span>;
  if (state.isNow) return <span className="text-accent">Now · {state.remaining} min left</span>;
  if (state.isNext) return <span className="text-accent">Next</span>;
  return null;
}

// One lesson period. Normal lessons are plain text with the subject's colour as a small
// swatch; colour and a top rule only appear when something is different - the lesson
// happening now, a change, or a cancellation.
export function PeriodCard({ occurrence, periodNumber, timeState, nowMinutes, onClick, layout = "cell" }: PeriodCardProps) {
  const state = useOccurrenceState(occurrence, timeState, nowMinutes);
  const Comp = onClick ? "button" : "div";
  const status = <StatusText state={state} />;
  const label = `${occurrence.title}, ${formatTimeRange(occurrence.startTime, occurrence.endTime)}${occurrence.room ? `, room ${occurrence.room}` : ""}`;

  if (layout === "row") {
    return (
      <Comp
        {...(onClick ? { type: "button" as const, onClick, "aria-label": label } : {})}
        className={cn(
          "relative flex w-full items-start gap-3 py-2.5 text-left",
          state.isNow && "bg-accent/[0.07]",
          state.isPast && !state.isNow && "opacity-50",
          onClick && "transition-colors hover:bg-tint/50"
        )}
      >
        {state.isNow && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
        <span className="w-16 shrink-0 pl-2.5 pt-px text-[0.8125rem] leading-tight tabular text-fg-muted">
          {formatTime(occurrence.startTime).replace(" ", " ")}
          <span className="block text-meta text-fg-faint">Period {periodNumber}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <SubjectSwatch color={occurrence.color} />
            <span className={cn("truncate text-sm font-medium text-fg", state.cancelled && "text-fg-muted line-through")}>{occurrence.title}</span>
          </span>
          <span className="mt-0.5 block truncate pl-4 text-meta text-fg-muted">
            {[occurrence.room && `Room ${occurrence.room}`, occurrence.changeNote].filter(Boolean).join(" · ") || " "}
          </span>
        </span>
        <span className="shrink-0 pr-2.5 pt-px text-meta font-medium">{status}</span>
      </Comp>
    );
  }

  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick, "aria-label": label } : {})}
      title={occurrence.changeNote || undefined}
      className={cn(
        "relative flex min-h-[6.75rem] min-w-0 flex-col items-stretch gap-1 border-t-2 px-3 pb-2.5 pt-2 text-left",
        state.cancelled ? "border-t-bad" : state.changed ? "border-t-warn" : state.isNow ? "border-t-accent" : "border-t-transparent",
        state.isNow && "bg-accent/[0.07]",
        state.isPast && !state.isNow && "opacity-50",
        onClick && "transition-colors hover:bg-tint/50"
      )}
    >
      <span className="flex items-baseline justify-between gap-2 text-meta tabular text-fg-faint">
        <span>{periodNumber}</span>
        <span>{formatTime(occurrence.startTime)}</span>
      </span>
      <span className="flex items-start gap-1.5">
        <SubjectSwatch color={occurrence.color} className="mt-[0.4rem]" />
        <span className={cn("line-clamp-2 hyphens-auto break-words text-sm font-semibold leading-snug text-fg", state.cancelled && "text-fg-muted line-through")}>
          {occurrence.title}
        </span>
      </span>
      {occurrence.room && <span className="pl-3.5 text-meta text-fg-muted">Room {occurrence.room}</span>}
      <span className="mt-auto pl-3.5 text-meta font-medium">{status}</span>
      {state.isNow && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-rule">
          <span className="block h-full bg-accent" style={{ width: `${state.progressPct}%` }} />
        </span>
      )}
    </Comp>
  );
}
