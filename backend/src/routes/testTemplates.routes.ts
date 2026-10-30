import { Router } from "express";
import * as controller from "../controllers/testTemplates.controller";
import { validateBody } from "../middleware/validate";
import { createTestTemplateSchema, updateTestTemplateSchema } from "../models/testTemplate.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createTestTemplateSchema), controller.create);
router.patch("/:id", validateBody(updateTestTemplateSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
