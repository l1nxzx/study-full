import rateLimit from "express-rate-limit";

// General API traffic - generous, this is a single-user personal app.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints hit a paid, metered API - keep this tight to control cost.
export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "AI_RATE_LIMITED", message: "Too many AI requests, please slow down." } },
});

// Login/register - slow down brute-force attempts.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "AUTH_RATE_LIMITED", message: "Too many attempts, please try again later." } },
});
