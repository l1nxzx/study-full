import { Router } from "express";
import * as controller from "../controllers/subjects.controller";
import { validateBody } from "../middleware/validate";
import { createSubjectSchema, updateSubjectSchema } from "../models/subject.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createSubjectSchema), controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", validateBody(updateSubjectSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
