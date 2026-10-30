import { z } from "zod";
import { testSettingsSchema } from "./test.model";

// A reusable way to set up a test, written by the student - typically one per teacher or
// subject ("Geography with Mr. X: short definitions, then two map questions..."). It holds
// the test settings and the notes for the AI.
export const createTestTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  subjectId: z.string().min(1).nullable().optional(),
  settings: testSettingsSchema,
});

export const updateTestTemplateSchema = createTestTemplateSchema.partial();

export type CreateTestTemplateInput = z.infer<typeof createTestTemplateSchema>;
export type UpdateTestTemplateInput = z.infer<typeof updateTestTemplateSchema>;
