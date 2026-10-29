import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as scheduleEventsService from "../services/scheduleEvents.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  res.json(await scheduleEventsService.listScheduleEvents(req.user!.userId, from, to));
});
