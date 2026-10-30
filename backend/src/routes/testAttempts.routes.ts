import { Router } from "express";
import * as controller from "../controllers/tests.controller";
import { aiRateLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { saveTestAnswersSchema } from "../models/test.model";

const router = Router();

router.get("/:id", controller.getAttempt);
router.patch("/:id", validateBody(saveTestAnswersSchema), controller.saveAnswers);
router.post("/:id/submit", aiRateLimiter, validateBody(saveTestAnswersSchema.partial()), controller.submitAttempt);
router.delete("/:id", controller.removeAttempt);

export default router;
