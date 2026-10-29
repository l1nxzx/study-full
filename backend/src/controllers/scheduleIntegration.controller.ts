import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import * as scheduleIntegrationService from "../services/scheduleIntegration.service";
import { syncUserSchedule } from "../services/icsSync.service";

function toFetchableUrl(icsUrl: string): string {
  return icsUrl.replace(/^webcal:\/\//i, "https://");
}

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const integration = await scheduleIntegrationService.getIntegration(req.user!.userId);

  if (!integration) {
    return res.json({ connected: false, sourceHost: null, lastSyncAt: null, lastSyncStatus: null, lastSyncError: null });
  }

  let sourceHost: string | null = null;
  try {
    sourceHost = new URL(toFetchableUrl(integration.icsUrl)).host;
  } catch {
    sourceHost = null;
  }

  res.json({
    connected: Boolean(integration.connected),
    sourceHost,
    lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toDate().toISOString() : null,
    lastSyncStatus: integration.lastSyncStatus ?? null,
    lastSyncError: integration.lastSyncError ?? null,
  });
});

export const connect = asyncHandler(async (req: Request, res: Response) => {
  await scheduleIntegrationService.saveIntegration(req.user!.userId, req.body.icsUrl);
  const result = await syncUserSchedule(req.user!.userId);

  if (!result.ok) {
    // Keep the connection saved even if the first sync fails (e.g. a typo'd URL should
    // still be visible/editable) but surface the failure clearly.
    throw AppError.badRequest(result.error || "Could not sync this calendar. Double-check the URL.", "SYNC_FAILED");
  }

  res.status(201).json({ connected: true });
});

export const syncNow = asyncHandler(async (req: Request, res: Response) => {
  const result = await syncUserSchedule(req.user!.userId);
  if (!result.ok) {
    throw AppError.serviceUnavailable(result.error || "Could not sync right now.", "SYNC_FAILED");
  }
  res.json({ ok: true });
});

export const disconnect = asyncHandler(async (req: Request, res: Response) => {
  await scheduleIntegrationService.disconnectIntegration(req.user!.userId);
  res.status(204).send();
});
