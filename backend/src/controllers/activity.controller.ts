import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/activity.service";

export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.recordHeartbeat(req.user!.userId, req.body));
});
