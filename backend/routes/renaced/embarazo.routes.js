import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getEmbarazos, createEmbarazo, updateEmbarazo, deleteEmbarazo } from "../../controllers/renaced/embarazo.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",        getEmbarazos);
router.post("/",       createEmbarazo);
router.put("/:id",     updateEmbarazo);
router.delete("/:id",  deleteEmbarazo);
export default router;
