import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as service from "../services/conversations.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { noteId, scope } = req.query as { noteId?: string; scope?: "general" | "note" };
  res.json(await service.listConversations(req.user!.userId, { noteId, scope }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getConversation(req.user!.userId, String(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createConversation(req.user!.userId, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateConversation(req.user!.userId, String(req.params.id), req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteConversation(req.user!.userId, String(req.params.id));
  res.status(204).send();
});
