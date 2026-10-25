import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { resolverAlcanceClinica } from "../middlewares/scopeClinica.js";
import { verificarModulo } from "../middlewares/verificarModulo.js";
import { exportarExcel, exportarCSV, iniciarExportExcel, estadoExportExcel, descargarExportExcel, exportarPDF, exportarReporteClinica } from "../controllers/reportes.controller.js";

const router = Router();
router.use(verificarToken, resolverTenantDB, resolverAlcanceClinica, verificarModulo("reportes"));
router.get("/excel", exportarExcel);
router.post("/excel/iniciar", iniciarExportExcel);
router.get("/excel/estado/:id", estadoExportExcel);
router.get("/excel/descargar/:id", descargarExportExcel);
router.get("/csv",   exportarCSV);
router.get("/pdf",   exportarPDF);
router.get("/clinica/:unidad_id", exportarReporteClinica);
export default router;
