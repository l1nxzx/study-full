import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
const taskType = z.enum(["homework", "exam"]);
const examKind = z.enum(["oral", "quiz", "major"]);

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    type: taskType.default("homework"),
    examKind: examKind.nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    subjectId: z.string().min(1).nullable().optional(),
    sessionId: z.string().min(1).nullable().optional(),
    dueDate: dateString.nullable().optional(),
  })
  .refine((data) => data.type !== "exam" || Boolean(data.dueDate), {
    message: "Exams require a date",
    path: ["dueDate"],
  })
  .refine((data) => data.type !== "exam" || Boolean(data.examKind), {
    message: "Exam kind is required",
    path: ["examKind"],
  });

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  type: taskType.optional(),
  examKind: examKind.nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  subjectId: z.string().min(1).nullable().optional(),
  sessionId: z.string().min(1).nullable().optional(),
  dueDate: dateString.nullable().optional(),
  completed: z.boolean().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
