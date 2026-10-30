import { Router } from "express";
import * as controller from "../controllers/quizAttempts.controller";
import { validateBody } from "../middleware/validate";
import { createQuizAttemptSchema, updateQuizAttemptSchema } from "../models/quizAttempt.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createQuizAttemptSchema), controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", validateBody(updateQuizAttemptSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
