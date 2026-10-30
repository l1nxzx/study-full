import { Router } from "express";
import * as controller from "../controllers/stats.controller";

const router = Router();

router.get("/overview", controller.overview);
router.get("/notes/:id", controller.note);
router.get("/subjects/:id", controller.subject);

export default router;
