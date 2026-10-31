import { NextFunction, Request, Response } from "express";
import { db } from "../config/firebase";
import { AppError } from "../utils/AppError";

// The admin area. Checked on every request against the account's record (never a copy kept in
// the token or the app): the account must exist, be a superadmin, and not be disabled.
export async function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  try {
    const doc = await db.collection("users").doc(req.user.userId).get();
    const data = doc.data();
    if (!doc.exists || data?.role !== "superadmin" || data?.disabled === true) {
      return next(AppError.forbidden("Only the superadmin can do this."));
    }
    next();
  } catch (err) {
    next(err);
  }
}
