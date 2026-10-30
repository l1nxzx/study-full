import { z } from "zod";

export const testSettingsSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "very_hard"]),
  thinking: z.enum(["recall", "understanding", "deep"]),
  logic: z.enum(["low", "medium", "high"]),
  durationMinutes: z.number().int().min(10).max(120),
  instructions: z.string().trim().max(3000).optional(),
});

export const createTestSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(15),
  title: z.string().trim().max(200).optional(),
  settings: testSettingsSchema,
});

export const saveTestAnswersSchema = z.object({
  answers: z.record(z.string().max(20), z.string().max(20000)),
  elapsedSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type SaveTestAnswersInput = z.infer<typeof saveTestAnswersSchema>;
