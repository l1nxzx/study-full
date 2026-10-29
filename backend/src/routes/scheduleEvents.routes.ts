import { Router } from "express";
import * as controller from "../controllers/scheduleEvents.controller";

const router = Router();

router.get("/", controller.list);

export default router;
