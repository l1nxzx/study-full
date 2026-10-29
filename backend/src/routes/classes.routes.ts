import { Router } from "express";
import * as controller from "../controllers/classes.controller";
import { validateBody } from "../middleware/validate";
import { createClassSchema, updateClassSchema } from "../models/class.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createClassSchema), controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", validateBody(updateClassSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
