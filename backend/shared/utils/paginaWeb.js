// Utilidades de las Páginas Web por país (landing pública previa al login).
// Ruta pública: /<pais>/<sistema>   p. ej. /mexico/renaced, /honduras/saapd

export function slugPais(nombre = "") {
  return String(nombre)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Honduras usa SAAPD (login /login); el resto usa RENACED (login /renaced/login).
export function sistemaDe(codigo) {
  return codigo === "hn" ? "saapd" : "renaced";
}
export function loginDe(codigo) {
  return codigo === "hn" ? "/login" : "/renaced/login";
}
export function rutaPagina(tenant) {
  return `/${slugPais(tenant.nombre)}/${sistemaDe(tenant.codigo)}`;
}

// Contenido inicial (plantilla) de una página nueva. Luego se podrá editar.
export function plantillaContenido(tenant) {
  const sis = sistemaDe(tenant.codigo) === "saapd" ? "SAAPD" : "RENACED";
  return {
    titulo: `${sis} ${tenant.nombre}`,
    eslogan: "Seguimiento clínico para cuidar mejor a cada paciente",
    color: "#0b3a6b",
    sobre_nosotros: `${sis} es la plataforma de ${tenant.nombre} para el registro y seguimiento clínico de pacientes. Reúne la información médica en un solo lugar, de forma segura y disponible para los equipos de salud.`,
    servicios: [
      { titulo: "Expediente clínico", texto: "Historia clínica, consultas y recetas en un solo expediente." },
      { titulo: "Seguimiento", texto: "Control de la evolución de cada paciente a lo largo del tiempo." },
      { titulo: "Reportes", texto: "Indicadores y reportes para la toma de decisiones." },
    ],
    contacto: { correo: "", telefono: "", direccion: "", whatsapp: "" },
  };
}
