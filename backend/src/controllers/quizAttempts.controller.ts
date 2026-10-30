import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/quizAttempts.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { noteId } = req.query as { noteId?: string };
  res.json(await service.listQuizAttempts(req.user!.userId, { noteId }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getQuizAttempt(req.user!.userId, String(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createQuizAttempt(req.user!.userId, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateQuizAttempt(req.user!.userId, String(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteQuizAttempt(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
