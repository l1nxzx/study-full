import { Router } from "express";
import * as controller from "../controllers/admin.controller";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";

// Every route here: requireAuth (applied where this router is mounted), then the superadmin check
// on the account's record, on every single request.
const router = Router();
router.use(requireSuperAdmin);

router.get("/users", controller.listUsers);
router.post("/users/:id/password", controller.setPassword);
router.post("/users/:id/disabled", controller.setDisabled);
router.get("/referral-codes", controller.listCodes);
router.post("/referral-codes", controller.createCode);
router.post("/referral-codes/:code/revoke", controller.revokeCode);
router.get("/audit", controller.audit);

export default router;
