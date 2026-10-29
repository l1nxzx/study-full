import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import * as notesService from "../services/notes.service";
import * as attachmentsService from "../services/attachments.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { subjectId, sessionId } = req.query as { subjectId?: string; sessionId?: string };
  res.json(await notesService.listNotes(req.user!.userId, { subjectId, sessionId }));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await notesService.getNoteWithAttachments(req.user!.userId, String(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const created = await notesService.createNote(req.user!.userId, req.body);
  res.status(201).json(created);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const updated = await notesService.updateNote(req.user!.userId, String(req.params.id), req.body);
  res.json(updated);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await notesService.deleteNote(req.user!.userId, String(req.params.id));
  res.status(204).send();
});

export const addAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest("No file uploaded", "NO_FILE");
  await notesService.getNoteRaw(req.user!.userId, String(req.params.id)); // ensures ownership
  const attachment = await attachmentsService.addAttachment(req.user!.userId, String(req.params.id), req.file);
  res.status(201).json(attachment);
});

export const removeAttachment = asyncHandler(async (req: Request, res: Response) => {
  await attachmentsService.deleteAttachment(req.user!.userId, String(req.params.id), String(req.params.attachmentId));
  res.status(204).send();
});
