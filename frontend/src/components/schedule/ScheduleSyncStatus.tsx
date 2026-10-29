import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScheduleIntegrationStatus, useSyncScheduleNow } from "@/hooks/useScheduleIntegration";
import { relativeSyncTime } from "@/lib/date";

export function ScheduleSyncStatus() {
  const { data: status } = useScheduleIntegrationStatus();
  const syncMutation = useSyncScheduleNow();

  if (!status?.connected) return null;

  if (status.lastSyncStatus === "error") {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <AlertTriangle className="size-3.5 shrink-0 text-warning" />
          Couldn't sync right now. Showing your last synchronized schedule.
        </span>
        <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? "Retrying..." : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <p className="mb-4 text-xs text-muted-foreground">
      {status.lastSyncAt ? `Schedule synced ${relativeSyncTime(status.lastSyncAt)}` : "Connected - syncing shortly..."}
    </p>
  );
}
