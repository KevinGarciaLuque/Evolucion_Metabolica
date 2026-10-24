// SVG real servido desde /public/flags (copia de la librería flag-icons) — a
// diferencia del emoji Unicode, se ve igual en Windows, Mac y Linux (Windows no
// trae fuente de emojis de bandera y solo muestra las dos letras del código).
// Funciona para cualquier país nuevo con solo su código ISO de 2 letras.
export default function FlagIcon({ codigo, size = 18, style, ...props }) {
  if (!codigo || codigo.length !== 2) return null;
  const cod = codigo.toLowerCase();
  return (
    <img
      src={`/flags/4x3/${cod}.svg`}
      alt={`Bandera ${codigo.toUpperCase()}`}
      style={{
        width: size * 1.33, height: size, objectFit: "cover",
        borderRadius: 3, display: "inline-block", flexShrink: 0, ...style,
      }}
      {...props}
    />
  );
}
