import { z } from "zod";

export const connectScheduleSchema = z.object({
  icsUrl: z
    .string()
    .trim()
    .min(1, "Paste your calendar URL")
    .refine((value) => {
      const normalized = value.replace(/^webcal:\/\//i, "https://");
      try {
        const parsed = new URL(normalized);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    }, "Enter a valid calendar URL (https:// or webcal://)"),
});

export type ConnectScheduleInput = z.infer<typeof connectScheduleSchema>;
