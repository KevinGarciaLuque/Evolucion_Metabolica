import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getPatologia, savePatologia } from "../../controllers/renaced/patologia.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",  getPatologia);
router.put("/",  savePatologia);
export default router;
