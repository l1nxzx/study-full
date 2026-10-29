import { Button } from "@/components/ui/button";
import { useScheduleIntegrationStatus, useSyncScheduleNow } from "@/hooks/useScheduleIntegration";
import { relativeSyncTime } from "@/lib/date";

export function ScheduleSyncStatus() {
  const { data: status } = useScheduleIntegrationStatus();
  const syncMutation = useSyncScheduleNow();

  if (!status?.connected) return null;

  if (status.lastSyncStatus === "error") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
        <span className="text-warn">Couldn't sync from EduPage. Showing the last synced timetable.</span>
        <Button size="sm" variant="link" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? "Retrying..." : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <p className="text-[0.8125rem] text-fg-faint">
      {status.lastSyncAt ? `Synced from EduPage ${relativeSyncTime(status.lastSyncAt)}` : "Connected to EduPage, syncing shortly..."}
    </p>
  );
}
