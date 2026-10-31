import { z } from "zod";

export const createReferralCodeSchema = z.object({
  maxUses: z.coerce.number().int().min(1).max(100),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine((v) => !v || Date.parse(v) > Date.now(), "Expiry must be in the future"),
  note: z.string().trim().max(100).optional(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const setDisabledSchema = z.object({
  disabled: z.boolean(),
});

export type CreateReferralCodeInput = z.infer<typeof createReferralCodeSchema>;
