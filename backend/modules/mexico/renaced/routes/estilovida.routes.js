import { Router } from "express";
import { verificarToken } from "../../../../shared/middlewares/auth.js";
import { resolverTenantDB } from "../middlewares/tenantDb.js";
import { getEstiloVida, createEstiloVida, deleteEstiloVida } from "../controllers/estilovida.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken, resolverTenantDB);
router.get("/",       getEstiloVida);
router.post("/",      createEstiloVida);
router.delete("/:id", deleteEstiloVida);
export default router;
