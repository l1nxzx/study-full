import { Router } from "express";
import * as controller from "../controllers/scheduleIntegration.controller";
import { validateBody } from "../middleware/validate";
import { connectScheduleSchema } from "../models/scheduleIntegration.model";

const router = Router();

router.get("/status", controller.getStatus);
router.post("/connect", validateBody(connectScheduleSchema), controller.connect);
router.post("/sync", controller.syncNow);
router.delete("/", controller.disconnect);

export default router;
