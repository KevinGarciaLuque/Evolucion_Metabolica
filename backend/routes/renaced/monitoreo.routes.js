import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import {
  getMonitoreoByPaciente, createMonitoreo, updateMonitoreo, deleteMonitoreo,
} from "../../controllers/renaced/monitoreo.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/", getMonitoreoByPaciente);
router.post("/", createMonitoreo);
router.put("/:monId", updateMonitoreo);
router.delete("/:monId", deleteMonitoreo);
export default router;
