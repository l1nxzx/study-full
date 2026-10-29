import { Router } from "express";
import * as controller from "../controllers/ai.controller";
import { aiRateLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import {
  askRequestSchema,
  chatRequestSchema,
  explainRequestSchema,
  flashcardsRequestSchema,
  practiceRequestSchema,
  quizRequestSchema,
  rewriteRequestSchema,
  summaryRequestSchema,
} from "../models/ai.model";

const router = Router();

router.use(aiRateLimiter);

router.post("/summary", validateBody(summaryRequestSchema), controller.summary);
router.post("/explain", validateBody(explainRequestSchema), controller.explain);
router.post("/quiz", validateBody(quizRequestSchema), controller.quiz);
router.post("/flashcards", validateBody(flashcardsRequestSchema), controller.flashcards);
router.post("/practice", validateBody(practiceRequestSchema), controller.practice);
router.post("/ask", validateBody(askRequestSchema), controller.ask);
router.post("/chat", validateBody(chatRequestSchema), controller.chat);
router.post("/rewrite", validateBody(rewriteRequestSchema), controller.rewrite);

export default router;
