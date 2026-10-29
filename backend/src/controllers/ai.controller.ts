import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { stripReviewMarkup } from "../utils/noteMarkup";
import * as notesService from "../services/notes.service";
import * as aiService from "../services/openai.service";
import { buildCacheKey, getCached, hashText, ONE_HOUR_MS, setCached } from "../services/aiCache.service";

async function loadOwnedNotes(userId: string, noteIds: string[]) {
  const notes = await Promise.all(noteIds.map((id) => notesService.getNoteRaw(userId, id)));
  return notes.map((n) => ({ title: n.title, contentMarkdown: stripReviewMarkup(n.contentMarkdown) }));
}

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const note = await notesService.getNoteRaw(req.user!.userId, req.body.noteId);
  const cleanContent = stripReviewMarkup(note.contentMarkdown);
  const cacheKey = buildCacheKey(["summary", req.user!.userId, req.body.noteId, hashText(cleanContent)]);

  if (!req.body.forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
  }

  const result = await aiService.generateSummary({ title: note.title, contentMarkdown: cleanContent });
  setCached(cacheKey, result, ONE_HOUR_MS);
  res.json(result);
});

export const explain = asyncHandler(async (req: Request, res: Response) => {
  const note = await notesService.getNoteRaw(req.user!.userId, req.body.noteId);
  const cleanContent = stripReviewMarkup(note.contentMarkdown);
  const cacheKey = buildCacheKey([
    "explain",
    req.user!.userId,
    req.body.noteId,
    req.body.mode,
    hashText(cleanContent + req.body.text),
  ]);

  if (!req.body.forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
  }

  const result = await aiService.explainText({ title: note.title, contentMarkdown: cleanContent }, req.body.text, req.body.mode);
  setCached(cacheKey, result, ONE_HOUR_MS);
  res.json(result);
});

export const quiz = asyncHandler(async (req: Request, res: Response) => {
  const notes = await loadOwnedNotes(req.user!.userId, req.body.noteIds);
  const result = await aiService.generateQuiz(notes, {
    numQuestions: req.body.numQuestions,
    difficulty: req.body.difficulty,
    questionTypes: req.body.questionTypes,
    includeBeyondNotes: req.body.includeBeyondNotes,
  });
  res.json(result);
});

export const flashcards = asyncHandler(async (req: Request, res: Response) => {
  const notes = await loadOwnedNotes(req.user!.userId, req.body.noteIds);
  const result = await aiService.generateFlashcards(notes, req.body.count);
  res.json(result);
});

export const practice = asyncHandler(async (req: Request, res: Response) => {
  const notes = await loadOwnedNotes(req.user!.userId, req.body.noteIds);
  const result = await aiService.generatePracticeQuestions(notes, {
    numQuestions: req.body.numQuestions,
    difficulty: req.body.difficulty,
    includeBeyondNotes: req.body.includeBeyondNotes,
  });
  res.json(result);
});

export const ask = asyncHandler(async (req: Request, res: Response) => {
  const note = await notesService.getNoteRaw(req.user!.userId, req.body.noteId);
  const result = await aiService.askNote(
    { title: note.title, contentMarkdown: stripReviewMarkup(note.contentMarkdown) },
    req.body.question,
    req.body.history
  );
  res.json(result);
});

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.generalChat(req.body.message, req.body.history, req.body.context);
  res.json(result);
});

export const rewrite = asyncHandler(async (req: Request, res: Response) => {
  const note = await notesService.getNoteRaw(req.user!.userId, req.body.noteId);
  const cleanContent = stripReviewMarkup(note.contentMarkdown);
  const result = await aiService.rewriteNote(
    { title: note.title, contentMarkdown: cleanContent },
    { scope: req.body.scope, selectionText: req.body.selectionText, instructions: req.body.instructions }
  );
  res.json(result);
});
