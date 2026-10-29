import { Router } from "express";
import * as controller from "../controllers/tasks.controller";
import { validateBody } from "../middleware/validate";
import { createTaskSchema, updateTaskSchema } from "../models/task.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createTaskSchema), controller.create);
router.patch("/:id", validateBody(updateTaskSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
