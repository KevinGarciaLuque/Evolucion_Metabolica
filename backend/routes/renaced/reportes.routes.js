import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../../middlewares/scopeClinica.js";
import { verificarModulo } from "../../middlewares/verificarModulo.js";
import { exportarExcel, exportarCSV, exportarPDF, exportarReporteClinica } from "../../controllers/renaced/reportes.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB, resolverAlcanceClinica, verificarModulo("reportes"));
router.get("/excel", exportarExcel);
router.get("/csv",   exportarCSV);
router.get("/pdf",   exportarPDF);
router.get("/clinica/:unidad_id", exportarReporteClinica);
export default router;
