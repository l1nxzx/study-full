import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Per-account display preferences, synced across devices. Every field is optional so a
// client can patch just the one it changed.
export const preferencesSchema = z
  .object({
    readingFont: z.enum(["literata", "instrument", "system-serif", "system-sans"]).optional(),
    uiFont: z.enum(["instrument", "system"]).optional(),
    notebookPaper: z.enum(["light", "dark"]).optional(),
    notebookTextSize: z.enum(["small", "medium", "large"]).optional(),
    dismissedTips: z.array(z.string().max(60)).max(50).optional(),
    // Subjects pinned to the top of the sidebar, in order, and how many subjects the sidebar
    // shows before "Show more" (0 shows all).
    pinnedSubjects: z.array(z.string().min(1).max(60)).max(50).optional(),
    sidebarSubjectCount: z.number().int().min(0).max(50).optional(),
  })
  .strict();

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(60, "Name is too long")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  preferences: preferencesSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
