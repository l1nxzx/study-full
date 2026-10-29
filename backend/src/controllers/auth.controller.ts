import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import * as authService from "../services/auth.service";
import { changePasswordSchema, updateProfileSchema } from "../models/auth.model";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Stateless JWTs - logout is a client-side token discard. Endpoint kept for API symmetry.
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await authService.getById(req.user.userId);
  res.json(user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.userId, input.name);
  res.json(user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.userId, input.currentPassword, input.newPassword);
  res.status(204).send();
});
