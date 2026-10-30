import type { DayStatus } from "@/lib/scheduleStatus";

// "In class · 23 min left · Physics" - a single line of live orientation for today.
export function DayStatusBadge({ status }: { status: DayStatus }) {
  return (
    <p className="text-[0.8125rem] text-fg-muted">
      <span className="font-medium text-fg">{status.label}</span>
      <span aria-hidden className="mx-1.5 text-fg-faint">·</span>
      {status.detail}
    </p>
  );
}
