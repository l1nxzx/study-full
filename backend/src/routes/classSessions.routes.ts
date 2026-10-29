import { Router } from "express";
import * as controller from "../controllers/classSessions.controller";
import { validateBody } from "../middleware/validate";
import { createClassSessionSchema, updateClassSessionSchema } from "../models/classSession.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createClassSessionSchema), controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", validateBody(updateClassSessionSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
