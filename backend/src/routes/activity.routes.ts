import { Router } from "express";
import * as controller from "../controllers/activity.controller";
import { validateBody } from "../middleware/validate";
import { activityHeartbeatSchema } from "../models/activity.model";

const router = Router();

router.post("/", validateBody(activityHeartbeatSchema), controller.heartbeat);

export default router;
