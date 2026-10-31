import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { accountStatus } from "../utils/accountStatus";
import { verifyToken } from "../utils/jwt";

// Every request must come from a token for an account that exists, is not disabled, and whose
// sessions haven't been ended since the token was issued.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized());
  }

  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(AppError.unauthorized("Invalid or expired session"));
  }

  try {
    const status = await accountStatus(payload.userId);
    if (!status) return next(AppError.unauthorized("Account not found"));
    if (status.disabled) return next(new AppError(403, "ACCOUNT_DISABLED", "This account has been disabled."));
    // Tokens issued at or before the cut-off are ended (tokens without the exact time use the second).
    const issuedAt = payload.issuedMs ?? Number((payload as { iat?: number }).iat ?? 0) * 1000;
    if (issuedAt <= status.sessionsValidFrom) {
      return next(new AppError(401, "SESSION_ENDED", "Your session has ended. Please sign in again."));
    }
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
