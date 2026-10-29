import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subjectId: z.string().min(1),
  sessionId: z.string().min(1).nullable().optional(),
  date: dateString,
  contentMarkdown: z.string().max(200_000).default(""),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  subjectId: z.string().min(1).optional(),
  sessionId: z.string().min(1).nullable().optional(),
  date: dateString.optional(),
  contentMarkdown: z.string().max(200_000).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
