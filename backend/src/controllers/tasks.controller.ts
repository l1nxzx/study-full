import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as tasksService from "../services/tasks.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { subjectId, sessionId } = req.query as { subjectId?: string; sessionId?: string };
  res.json(await tasksService.listTasks(req.user!.userId, { subjectId, sessionId }));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const created = await tasksService.createTask(req.user!.userId, req.body);
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const updated = await tasksService.updateTask(req.user!.userId, String(req.params.id), req.body);
  res.json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await tasksService.deleteTask(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
