import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as classesService from "../services/classes.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await classesService.listClasses(req.user!.userId));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await classesService.getClass(req.user!.userId, String(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const created = await classesService.createClass(req.user!.userId, req.body);
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const updated = await classesService.updateClass(req.user!.userId, String(req.params.id), req.body);
  res.json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await classesService.deleteClass(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
