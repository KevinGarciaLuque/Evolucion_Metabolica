import { Router } from "express";
import { loginRenaced, meRenaced } from "../../controllers/renaced/auth.controller.js";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";

const router = Router();

router.post("/login", loginRenaced);
router.get("/me", verificarToken, resolverTenantDB, meRenaced);

export default router;
