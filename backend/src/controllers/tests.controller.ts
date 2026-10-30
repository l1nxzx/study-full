import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/tests.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listTests(req.user!.userId));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getTest(req.user!.userId, String(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createTest(req.user!.userId, req.body));
});

export const retry = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.retryTest(req.user!.userId, String(req.params.id)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteTest(req.user!.userId, String(req.params.id));
  res.status(204).send();
});

export const startAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.startAttempt(req.user!.userId, String(req.params.id)));
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getAttempt(req.user!.userId, String(req.params.id)));
});

export const saveAnswers = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.saveAnswers(req.user!.userId, String(req.params.id), req.body));
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.submitAttempt(req.user!.userId, String(req.params.id), req.body?.answers ? req.body : undefined));
});

export const regradeAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.submitAttempt(req.user!.userId, String(req.params.id), undefined, { regrade: true }));
});

export const removeAttempt = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteAttempt(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
