import { Request } from "express";

// Express query values can be string | string[] | ParsedQs | ParsedQs[] | undefined.
// These routes only ever expect simple string filters, so normalize to that.
export function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (typeof value === "string") return value || undefined;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
