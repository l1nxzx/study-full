import { z } from "zod";

// ---- Requests ----

export const summaryRequestSchema = z.object({
  noteId: z.string().min(1),
  forceRefresh: z.boolean().optional().default(false),
});

export const explainRequestSchema = z.object({
  noteId: z.string().min(1),
  text: z.string().trim().min(1).max(4000),
  mode: z.enum(["simple", "detailed"]).default("simple"),
  forceRefresh: z.boolean().optional().default(false),
});

export const quizRequestSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(10),
  numQuestions: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z
    .array(z.enum(["multiple_choice", "true_false", "short_answer"]))
    .min(1),
  includeBeyondNotes: z.boolean().optional().default(false),
});

export const flashcardsRequestSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(10),
  count: z.number().int().min(5).max(20).default(10),
});

export const practiceRequestSchema = z.object({
  noteIds: z.array(z.string().min(1)).min(1).max(10),
  numQuestions: z.number().int().min(3).max(15).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  includeBeyondNotes: z.boolean().optional().default(false),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
  context: z.string().max(4000).optional(),
});

export const rewriteRequestSchema = z
  .object({
    noteId: z.string().min(1),
    scope: z.enum(["full", "selection"]).default("full"),
    selectionText: z.string().trim().min(1).max(4000).optional(),
    instructions: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.scope !== "selection" || Boolean(v.selectionText), {
    message: "selectionText is required when scope is \"selection\"",
    path: ["selectionText"],
  });

export const askRequestSchema = z.object({
  noteId: z.string().min(1),
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

// ---- AI structured output (validated after coming back from OpenAI) ----

export const summaryResultSchema = z.object({
  quickSummary: z.string(),
  keyPoints: z.array(z.string()),
});

export const explainResultSchema = z.object({
  explanation: z.string(),
});

const multipleChoiceQuestion = z.object({
  type: z.literal("multiple_choice"),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  beyondNotes: z.boolean().optional(),
});

const trueFalseQuestion = z.object({
  type: z.literal("true_false"),
  question: z.string(),
  correctAnswer: z.boolean(),
  explanation: z.string(),
  beyondNotes: z.boolean().optional(),
});

const shortAnswerQuestion = z.object({
  type: z.literal("short_answer"),
  question: z.string(),
  sampleAnswer: z.string(),
  explanation: z.string(),
  beyondNotes: z.boolean().optional(),
});

export const quizQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestion,
  trueFalseQuestion,
  shortAnswerQuestion,
]);

export const quizResultSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1),
});

export const flashcardSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const flashcardsResultSchema = z.object({
  cards: z.array(flashcardSchema).min(1),
});

export const practiceQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(["calculation", "short_answer", "application", "concept"]),
  hint: z.string().optional(),
  answer: z.string(),
  beyondNotes: z.boolean().optional(),
});

export const practiceResultSchema = z.object({
  questions: z.array(practiceQuestionSchema).min(1),
});

export const askResultSchema = z.object({
  answer: z.string(),
  groundedInNote: z.boolean(),
});

export const chatResultSchema = z.object({
  answer: z.string(),
});

export const rewriteResultSchema = z.object({
  rewritten: z.string(),
});

export type QuizRequestInput = z.infer<typeof quizRequestSchema>;
export type FlashcardsRequestInput = z.infer<typeof flashcardsRequestSchema>;
export type PracticeRequestInput = z.infer<typeof practiceRequestSchema>;
export type AskRequestInput = z.infer<typeof askRequestSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type ExplainRequestInput = z.infer<typeof explainRequestSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
