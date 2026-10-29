import { CheckCircle2, RefreshCw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useConnectSchedule,
  useDisconnectSchedule,
  useScheduleIntegrationStatus,
  useSyncScheduleNow,
} from "@/hooks/useScheduleIntegration";
import { relativeSyncTime } from "@/lib/date";

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
    <Card>
      <CardHeader>
        <CardTitle>Schedule Integration</CardTitle>
        <CardDescription>
          Import your timetable from EduPage's iCalendar/webcal link. Study fetches this feed directly - no Google
          account needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoading && status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              <span className="font-medium text-foreground">Connected</span>
              {status.sourceHost && <span className="text-muted-foreground">to {status.sourceHost}</span>}
            </div>

            <p className="text-xs text-muted-foreground">
              {status.lastSyncStatus === "error"
                ? `Last sync failed${status.lastSyncError ? `: ${status.lastSyncError}` : ""}`
                : status.lastSyncAt
                  ? `Last synced ${relativeSyncTime(status.lastSyncAt)}`
                  : "Not synced yet"}
            </p>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw /> {syncMutation.isPending ? "Syncing..." : "Sync now"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ics-url">EduPage Calendar URL</Label>
              <Input
                id="ics-url"
                placeholder="https://yourschool.edupage.org/webcal?pwd=...&type=plan&studentid=..."
                value={icsUrl}
                onChange={(e) => setIcsUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Works with webcal:// links too. This URL is private and is only ever stored on the backend.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!icsUrl.trim() || connectMutation.isPending}>
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
