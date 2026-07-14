import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getEstiloVida, createEstiloVida, deleteEstiloVida } from "../../controllers/renaced/estilovida.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",       getEstiloVida);
router.post("/",      createEstiloVida);
router.delete("/:id", deleteEstiloVida);
export default router;
