import { RefreshCw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  useConnectSchedule,
  useDisconnectSchedule,
  useScheduleIntegrationStatus,
  useSyncScheduleNow,
} from "@/hooks/useScheduleIntegration";
import { relativeSyncTime } from "@/lib/date";
import { SettingsSection } from "./SettingsSection";

export function ScheduleIntegrationCard() {
  const { data: status, isLoading } = useScheduleIntegrationStatus();
  const connectMutation = useConnectSchedule();
  const syncMutation = useSyncScheduleNow();
  const disconnectMutation = useDisconnectSchedule();

  const [icsUrl, setIcsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await connectMutation.mutateAsync(icsUrl);
      setIcsUrl("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not connect to this calendar"));
    }
  }

  return (
    <SettingsSection
      title="Timetable import"
      description="Import your timetable, substitutions and cancellations from EduPage's iCalendar link. No Google account needed."
    >
      {isLoading ? null : status?.connected ? (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium text-fg">
              Connected{status.sourceHost && <span className="font-normal text-fg-muted"> to {status.sourceHost}</span>}
            </p>
            <p className={status.lastSyncStatus === "error" ? "mt-0.5 text-[0.8125rem] text-warn" : "mt-0.5 text-[0.8125rem] text-fg-muted"}>
              {status.lastSyncStatus === "error"
                ? `Last sync failed${status.lastSyncError ? `: ${status.lastSyncError}` : ""}`
                : status.lastSyncAt
                  ? `Last synced ${relativeSyncTime(status.lastSyncAt)}`
                  : "Not synced yet"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className={syncMutation.isPending ? "animate-spin" : undefined} /> {syncMutation.isPending ? "Syncing..." : "Sync now"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-bad hover:bg-bad/10 hover:text-bad"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
          <Field
            label="EduPage calendar link"
            htmlFor="ics-url"
            hint="webcal:// links work too. The link is private and only ever stored on the server."
          >
            <Input
              id="ics-url"
              placeholder="https://yourschool.edupage.org/webcal?..."
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              required
            />
          </Field>
          <InlineError>{error}</InlineError>
          <Button type="submit" variant="outline" disabled={!icsUrl.trim() || connectMutation.isPending}>
            {connectMutation.isPending ? "Connecting..." : "Connect"}
          </Button>
        </form>
      )}
    </SettingsSection>
  );
}
