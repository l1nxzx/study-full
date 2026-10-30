import * as scheduleIntegrationService from "../services/scheduleIntegration.service";
import { syncUserSchedule } from "../services/icsSync.service";

// A school timetable changes rarely; one sync a day per calendar is enough. The loop checks
// hourly and syncs only calendars last synced more than 23 hours ago, so a restart (or a
// Render wake-up) does not sync again straight away.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SYNC_EVERY_MS = 23 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 10_000; // let the server finish booting first

async function syncDueSchedules(): Promise<void> {
  let integrations: Awaited<ReturnType<typeof scheduleIntegrationService.listConnectedIntegrations>>;
  try {
    integrations = await scheduleIntegrationService.listConnectedIntegrations();
  } catch (err) {
    console.error("Could not list connected schedule integrations:", err);
    return;
  }

  const now = Date.now();
  for (const { userId, lastSyncAtMs } of integrations) {
    if (lastSyncAtMs !== null && now - lastSyncAtMs < SYNC_EVERY_MS) continue;
    try {
      await syncUserSchedule(userId);
    } catch (err) {
      console.error(`Schedule sync failed for user ${userId}:`, err);
    }
  }
}

// Personal single-instance app - a plain interval is all that's needed, no job queue.
export function startScheduleSyncLoop(): void {
  setTimeout(syncDueSchedules, INITIAL_DELAY_MS);
  setInterval(syncDueSchedules, CHECK_INTERVAL_MS);
}
