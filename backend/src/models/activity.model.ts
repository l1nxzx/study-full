import { z } from "zod";

export const ACTIVITY_AREAS = ["notes", "notebook", "assistant", "quiz", "flashcards", "tests", "planning", "other"] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const activityHeartbeatSchema = z.object({
  // Unique per update: an update sent again is counted once.
  id: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
  // The client's local calendar date, so "today" means the student's today.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        area: z.enum(ACTIVITY_AREAS),
        noteId: id.optional(),
        subjectId: id.optional(),
        testId: id.optional(),
        seconds: z.number().int().min(1).max(900),
      })
    )
    .min(1)
    .max(40),
});

export type ActivityHeartbeatInput = z.infer<typeof activityHeartbeatSchema>;
