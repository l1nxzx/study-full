import { Router } from "express";
import * as controller from "../controllers/tests.controller";
import { aiRateLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { createTestSchema } from "../models/test.model";

const router = Router();

router.get("/", controller.list);
router.post("/", aiRateLimiter, validateBody(createTestSchema), controller.create);
router.get("/:id", controller.getOne);
router.post("/:id/retry", aiRateLimiter, controller.retry);
router.delete("/:id", controller.remove);
router.post("/:id/attempts", controller.startAttempt);

export default router;
