import { Router } from "express";
import { verificarToken } from "../../middlewares/auth.js";
import { getToxicomanias, createToxicomanias, deleteToxicomanias } from "../../controllers/renaced/toxicomanias.controller.js";

const router = Router({ mergeParams: true });
router.use(verificarToken);
router.get("/",       getToxicomanias);
router.post("/",      createToxicomanias);
router.delete("/:id", deleteToxicomanias);
export default router;
