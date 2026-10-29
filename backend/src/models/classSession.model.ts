import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const createClassSessionSchema = z.object({
  classId: z.string().min(1).nullable().optional(),
  subjectId: z.string().min(1),
  date: dateString,
  title: z.string().trim().max(200).optional(),
});

export const updateClassSessionSchema = z.object({
  subjectId: z.string().min(1).optional(),
  date: dateString.optional(),
  title: z.string().trim().max(200).optional(),
});

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;
export type UpdateClassSessionInput = z.infer<typeof updateClassSessionSchema>;
