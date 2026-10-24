import { Router } from "express";
import {
  listarInsulina, crearInsulina, actualizarInsulina, eliminarInsulina,
  listarAlimentacion, crearAlimentacion, actualizarAlimentacion, eliminarAlimentacion,
  listarAnticuerpos, crearAnticuerpos, actualizarAnticuerpos, eliminarAnticuerpos,
  relacionIC,
} from "../controllers/clinico.controller.js";
import { verificarToken, noAsistente } from "../middlewares/auth.js";

const router = Router();
router.use(verificarToken);

// Historial de insulina
router.get("/:id/insulina",              listarInsulina);
router.post("/:id/insulina",             crearInsulina);
router.put("/:id/insulina/:regId",       noAsistente, actualizarInsulina);
router.delete("/:id/insulina/:regId",    noAsistente, eliminarInsulina);

// Planes de alimentación
router.get("/:id/alimentacion",          listarAlimentacion);
router.post("/:id/alimentacion",         crearAlimentacion);
router.put("/:id/alimentacion/:regId",   noAsistente, actualizarAlimentacion);
router.delete("/:id/alimentacion/:regId", noAsistente, eliminarAlimentacion);

// Historial de anticuerpos
router.get("/:id/anticuerpos",              listarAnticuerpos);
router.post("/:id/anticuerpos",             crearAnticuerpos);
router.put("/:id/anticuerpos/:regId",       noAsistente, actualizarAnticuerpos);
router.delete("/:id/anticuerpos/:regId",    noAsistente, eliminarAnticuerpos);

// Relación Insulina:Carbohidratos
router.get("/:id/relacion-ic",              relacionIC);

export default router;
