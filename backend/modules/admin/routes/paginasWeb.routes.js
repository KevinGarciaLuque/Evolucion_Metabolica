import { Router } from "express";
import { verificarToken } from "../../../shared/middlewares/auth.js";
import { listarPaginas, obtenerPagina, crearPagina, cambiarEstado } from "../controllers/paginasWeb.controller.js";

const router = Router();
router.use(verificarToken, (req, res, next) => {
  if (req.usuario?.rol !== "SUPER_ADMIN") return res.status(403).json({ error: "Acceso restringido a Super Admin" });
  next();
});

router.get("/", listarPaginas);
router.get("/:codigo", obtenerPagina);
router.post("/:codigo", crearPagina);
router.put("/:codigo/estado", cambiarEstado);

export default router;
