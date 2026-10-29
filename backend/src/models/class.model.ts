import { z } from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm 24h format");

export const createClassSchema = z
  .object({
    subjectId: z.string().min(1),
    weekday: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    room: z.string().trim().max(50).optional(),
    teacher: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const updateClassSchema = z.object({
  subjectId: z.string().min(1).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
  room: z.string().trim().max(50).optional(),
  teacher: z.string().trim().max(100).optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
