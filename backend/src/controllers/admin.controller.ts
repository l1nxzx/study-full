import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as adminService from "../services/admin.service";
import * as referralService from "../services/referralCodes.service";
import * as auditService from "../services/adminAudit.service";
import { createReferralCodeSchema, setDisabledSchema, setPasswordSchema } from "../models/admin.model";

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await adminService.listUsers());
});

export const setPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = setPasswordSchema.parse(req.body);
  await adminService.setUserPassword(req.user!.userId, String(req.params.id), input.password);
  res.status(204).send();
});

export const setDisabled = asyncHandler(async (req: Request, res: Response) => {
  const input = setDisabledSchema.parse(req.body);
  await adminService.setUserDisabled(req.user!.userId, String(req.params.id), input.disabled);
  res.status(204).send();
});

export const listCodes = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await referralService.listReferralCodes());
});

export const createCode = asyncHandler(async (req: Request, res: Response) => {
  const input = createReferralCodeSchema.parse(req.body);
  res.status(201).json(await referralService.createReferralCode(req.user!.userId, input));
});

export const revokeCode = asyncHandler(async (req: Request, res: Response) => {
  res.json(await referralService.revokeReferralCode(req.user!.userId, String(req.params.code)));
});

export const audit = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await auditService.recentAdminActions());
});
