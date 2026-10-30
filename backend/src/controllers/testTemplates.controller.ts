import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/testTemplates.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listTemplates(req.user!.userId));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createTemplate(req.user!.userId, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateTemplate(req.user!.userId, String(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteTemplate(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
