import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/stats.service";

const querySchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  tz: z.coerce.number().int().min(-900).max(900).default(0),
});

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  res.json(await service.overview(req.user!.userId, q.today, q.tz));
});

export const note = asyncHandler(async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  res.json(await service.noteStats(req.user!.userId, String(req.params.id), q.today));
});

export const subject = asyncHandler(async (req: Request, res: Response) => {
  const q = querySchema.parse(req.query);
  res.json(await service.subjectStats(req.user!.userId, String(req.params.id), q.today));
});
