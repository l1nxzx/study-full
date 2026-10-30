import { z } from "zod";
import { quizQuestionSchema } from "./ai.model";

export const quizAnswerSchema = z.object({
  checked: z.boolean(),
  selectedIndex: z.number().int().min(0).max(7).optional(),
  selectedBool: z.boolean().optional(),
  shortAnswerText: z.string().max(5000).optional(),
  markedCorrect: z.boolean().optional(),
});

export const quizSettingsSchema = z.object({
  numQuestions: z.number().int().min(1).max(25),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.array(z.enum(["multiple_choice", "true_false", "short_answer"])).min(1),
  includeBeyondNotes: z.boolean().optional(),
  instructions: z.string().max(1000).optional(),
});

export const createQuizAttemptSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(10),
  settings: quizSettingsSchema,
  questions: z.array(quizQuestionSchema).min(1).max(25),
  retryOf: z.string().min(1).optional(),
});

export const updateQuizAttemptSchema = z.object({
  answers: z.array(quizAnswerSchema).max(25),
  completed: z.boolean().optional(),
});

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type CreateQuizAttemptInput = z.infer<typeof createQuizAttemptSchema>;
export type UpdateQuizAttemptInput = z.infer<typeof updateQuizAttemptSchema>;
