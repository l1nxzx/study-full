import { Router } from "express";
import * as controller from "../controllers/notes.controller";
import { validateBody } from "../middleware/validate";
import { createNoteSchema, updateNoteSchema } from "../models/note.model";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", controller.list);
router.post("/", validateBody(createNoteSchema), controller.create);
router.get("/:id", controller.getOne);
router.patch("/:id", validateBody(updateNoteSchema), controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/attachments", upload.single("file"), controller.addAttachment);
router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);

export default router;
