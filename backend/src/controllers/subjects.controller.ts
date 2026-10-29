import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as subjectsService from "../services/subjects.service";
import * as notesService from "../services/notes.service";
import * as tasksService from "../services/tasks.service";
import * as classSessionsService from "../services/classSessions.service";
import * as classesService from "../services/classes.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await subjectsService.listSubjects(req.user!.userId));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const subject = await subjectsService.getSubject(req.user!.userId, String(req.params.id));
  const [notes, tasks, sessions, classes] = await Promise.all([
    notesService.listNotes(req.user!.userId, { subjectId: String(req.params.id), limit: 5 }),
    tasksService.listTasks(req.user!.userId, { subjectId: String(req.params.id) }),
    classSessionsService.listClassSessions(req.user!.userId, { subjectId: String(req.params.id) }),
    classesService.listClasses(req.user!.userId),
  ]);

  res.json({
    ...subject,
    recentNotes: notes,
    upcomingTasks: tasks.filter((t: any) => !t.completed).slice(0, 5),
    recentSessions: sessions.slice(0, 5),
    schedule: classes.filter((c: any) => c.subjectId === String(req.params.id)),
    noteCount: notes.length,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const subject = await subjectsService.createSubject(req.user!.userId, req.body);
  res.status(201).json(subject);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const subject = await subjectsService.updateSubject(req.user!.userId, String(req.params.id), req.body);
  res.json(subject);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await subjectsService.deleteSubject(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
