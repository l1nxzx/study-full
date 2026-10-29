import { Clock } from "lucide-react";
import type { DayStatus } from "@/lib/scheduleStatus";

export function DayStatusBadge({ status }: { status: DayStatus }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
      <Clock className="size-4 shrink-0 text-muted-foreground" />
      <div className="text-right leading-tight">
        <p className="text-xs font-semibold text-foreground">{status.label}</p>
        <p className="text-[11px] text-muted-foreground">{status.detail}</p>
      </div>
    </div>
  );
}
