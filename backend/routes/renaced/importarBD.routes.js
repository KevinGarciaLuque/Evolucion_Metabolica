import { Router } from "express";
import multer from "multer";
import { verificarToken } from "../../middlewares/auth.js";
import { resolverTenantDB } from "../../middlewares/tenantDb.js";
import { verificarModulo } from "../../middlewares/verificarModulo.js";
import { importarBaseDatosMexico } from "../../controllers/renaced/importarBD.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

const uploadSql = (req, res, next) => {
  upload.single("archivo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: `Error al procesar archivo: ${err.message}` });
    next();
  });
};

router.use(verificarToken, resolverTenantDB, verificarModulo("importar_bd"));
router.post("/", uploadSql, importarBaseDatosMexico);

export default router;
