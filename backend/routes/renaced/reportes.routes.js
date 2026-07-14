import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { exportarExcel, exportarCSV, exportarPDF } from "../../controllers/renaced/reportes.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB);
router.get("/excel", exportarExcel);
router.get("/csv",   exportarCSV);
router.get("/pdf",   exportarPDF);
export default router;
