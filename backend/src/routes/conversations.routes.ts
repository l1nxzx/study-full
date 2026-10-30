import { Router } from "express";
import * as controller from "../controllers/conversations.controller";
import { validateBody } from "../middleware/validate";
import { createConversationSchema, updateConversationSchema } from "../models/conversation.model";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createConversationSchema), controller.create);
router.get("/:id", controller.getOne);
router.put("/:id", validateBody(updateConversationSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
