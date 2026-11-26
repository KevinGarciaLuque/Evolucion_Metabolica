// Fotos del equipo incluidas en el sistema. En el editor se elige una por su clave;
// también se puede pegar la dirección (https://…) de una imagen.
import lesby from "../../assets/Lesvy.png";
import leonela from "../../assets/Leonela.png";

export const FOTOS = { lesby, leonela };

export const urlFoto = (foto) => {
  if (!foto) return null;
  if (FOTOS[foto]) return FOTOS[foto];
  return /^(https?:)?\/\//.test(foto) || foto.startsWith("/") ? foto : null;
};
