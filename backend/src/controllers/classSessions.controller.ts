import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as classSessionsService from "../services/classSessions.service";
import * as notesService from "../services/notes.service";
import * as tasksService from "../services/tasks.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { subjectId, date } = req.query as { subjectId?: string; date?: string };
  res.json(await classSessionsService.listClassSessions(req.user!.userId, { subjectId, date }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const session = await classSessionsService.getClassSession(req.user!.userId, String(req.params.id));
  const [notes, tasks] = await Promise.all([
    notesService.listNotes(req.user!.userId, { sessionId: String(req.params.id) }),
    tasksService.listTasks(req.user!.userId, { sessionId: String(req.params.id) }),
  ]);
  res.json({ ...session, notes, tasks });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const created = await classSessionsService.createClassSession(req.user!.userId, req.body);
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const updated = await classSessionsService.updateClassSession(req.user!.userId, String(req.params.id), req.body);
  res.json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await classSessionsService.deleteClassSession(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
