import { Router } from "express";
import {
  listarInsulina, crearInsulina, actualizarInsulina, eliminarInsulina,
  listarAlimentacion, crearAlimentacion, actualizarAlimentacion, eliminarAlimentacion,
  listarAnticuerpos, crearAnticuerpos, actualizarAnticuerpos, eliminarAnticuerpos,
  relacionIC,
} from "../controllers/clinico.controller.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();
router.use(verificarToken);

// Historial de insulina
router.get("/:id/insulina",              listarInsulina);
router.post("/:id/insulina",             crearInsulina);
router.put("/:id/insulina/:regId",       actualizarInsulina);
router.delete("/:id/insulina/:regId",    eliminarInsulina);

// Planes de alimentación
router.get("/:id/alimentacion",          listarAlimentacion);
router.post("/:id/alimentacion",         crearAlimentacion);
router.put("/:id/alimentacion/:regId",   actualizarAlimentacion);
router.delete("/:id/alimentacion/:regId", eliminarAlimentacion);

// Historial de anticuerpos
router.get("/:id/anticuerpos",              listarAnticuerpos);
router.post("/:id/anticuerpos",             crearAnticuerpos);
router.put("/:id/anticuerpos/:regId",       actualizarAnticuerpos);
router.delete("/:id/anticuerpos/:regId",    eliminarAnticuerpos);

// Relación Insulina:Carbohidratos
router.get("/:id/relacion-ic",              relacionIC);

export default router;
