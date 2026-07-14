import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import {
  getTratamientoByPaciente, createTratamiento,
  createTratamientoOtx, updateTratamientoOtx, deleteTratamientoOtx,
  createAjusteDosis, updateAjusteDosis, deleteAjusteDosis,
} from "../../controllers/renaced/tratamiento.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",  getTratamientoByPaciente);
router.post("/", createTratamiento);

// Otros tratamientos
router.post("/otros",            createTratamientoOtx);
router.put("/otros/:otxId",      updateTratamientoOtx);
router.delete("/otros/:otxId",   deleteTratamientoOtx);

// Ajustes de dosis de insulina
router.post("/ajustes",             createAjusteDosis);
router.put("/ajustes/:ajusteId",    updateAjusteDosis);
router.delete("/ajustes/:ajusteId", deleteAjusteDosis);

export default router;
