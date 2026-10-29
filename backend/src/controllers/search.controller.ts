import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as searchService from "../services/search.service";

export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ results: await searchService.search(req.user!.userId, q) });
});
