import * as scheduleIntegrationService from "../services/scheduleIntegration.service";
import { syncUserSchedule } from "../services/icsSync.service";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const INITIAL_DELAY_MS = 10_000; // let the server finish booting first

async function syncAllConnectedSchedules(): Promise<void> {
  let userIds: string[];
  try {
    userIds = await scheduleIntegrationService.listConnectedUserIds();
  } catch (err) {
    console.error("Could not list connected schedule integrations:", err);
    return;
  }

  for (const userId of userIds) {
    try {
      await syncUserSchedule(userId);
    } catch (err) {
      console.error(`Schedule sync failed for user ${userId}:`, err);
    }
  }
}

// Personal single-instance app - a plain interval is all that's needed, no job queue.
export function startScheduleSyncLoop(): void {
  setTimeout(syncAllConnectedSchedules, INITIAL_DELAY_MS);
  setInterval(syncAllConnectedSchedules, SYNC_INTERVAL_MS);
}
