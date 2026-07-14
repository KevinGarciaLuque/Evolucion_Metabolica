import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import {
  getMonitoreoByPaciente, createMonitoreo, updateMonitoreo, deleteMonitoreo,
} from "../../controllers/renaced/monitoreo.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/", getMonitoreoByPaciente);
router.post("/", createMonitoreo);
router.put("/:monId", updateMonitoreo);
router.delete("/:monId", deleteMonitoreo);
export default router;
