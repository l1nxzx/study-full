import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  icon: z.string().trim().max(50).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex code like #4f46e5")
    .optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
