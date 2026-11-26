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

// Contenido inicial (plantilla) de una página nueva. Luego se edita desde "Mi página web".
// Esquema: titulo, eslogan, color, sobre_nosotros, historia, hitos[{anio,texto}],
// equipo[{nombre,cargo,bio,foto}], proyectos[{titulo,texto,estado,fecha}],
// servicios[{titulo,texto}], talleres[{titulo,texto,fecha,lugar}], contacto{correo,telefono,whatsapp,direccion}.
export function plantillaContenido(tenant) {
  const sis = sistemaDe(tenant.codigo) === "saapd" ? "SAAPD" : "RENACED";
  const base = {
    titulo: `${sis} ${tenant.nombre}`,
    eslogan: "Seguimiento clínico para cuidar mejor a cada paciente",
    color: "#0b3a6b",
    sobre_nosotros: `${sis} es la plataforma de ${tenant.nombre} para el registro y seguimiento clínico de pacientes. Reúne la información médica en un solo lugar, de forma segura y disponible para los equipos de salud.`,
    historia: "",
    hitos: [],
    equipo: [],
    proyectos: [],
    servicios: [
      { titulo: "Expediente clínico", texto: "Historia clínica, consultas y recetas en un solo expediente." },
      { titulo: "Seguimiento", texto: "Control de la evolución de cada paciente a lo largo del tiempo." },
      { titulo: "Reportes", texto: "Indicadores y reportes para la toma de decisiones." },
    ],
    talleres: [],
    contacto: { correo: "", telefono: "", direccion: "", whatsapp: "" },
  };
  if (tenant.codigo !== "hn") return base;
  return {
    ...base,
    titulo: "Evolución Metabólica Honduras",
    eslogan: "Ciencia, cercanía y tecnología al servicio de las personas con diabetes",
    sobre_nosotros: "Somos un equipo médico dedicado al cuidado integral de niñas, niños, adolescentes y adultos con diabetes en Honduras. Combinamos la experiencia clínica con el monitoreo continuo de glucosa y herramientas digitales para acompañar a cada paciente y a su familia.",
    historia: "Evolución Metabólica nace de la necesidad de dar un seguimiento más cercano y ordenado a las personas con diabetes en Honduras. Lo que comenzó como un esfuerzo clínico se convirtió en un sistema propio que hoy forma parte del Registro Latinoamericano de Diabetes, junto a otros países de la región.",
    hitos: [
      { anio: "", texto: "Nacimiento del programa de seguimiento clínico en Honduras." },
      { anio: "", texto: "Incorporación del monitoreo continuo de glucosa a la consulta." },
      { anio: "", texto: "Honduras se une al Registro Latinoamericano de Diabetes." },
    ],
    equipo: [
      { nombre: "Dra. Lesby", cargo: "Médica del equipo", bio: "Parte del equipo médico de Evolución Metabólica Honduras.", foto: "lesby" },
      { nombre: "Dra. Leonela", cargo: "Médica del equipo", bio: "Parte del equipo médico de Evolución Metabólica Honduras.", foto: "leonela" },
    ],
    proyectos: [
      { titulo: "Registro Latinoamericano de Diabetes", texto: "Honduras participa con datos clínicos agregados para impulsar la investigación regional en diabetes.", estado: "en_curso", fecha: "" },
      { titulo: "Próximos proyectos", texto: "Estamos preparando nuevas iniciativas de investigación y educación. Pronto las anunciaremos aquí.", estado: "proximo", fecha: "" },
    ],
    servicios: [
      { titulo: "Atención integral de la diabetes", texto: "Consulta médica con seguimiento personalizado para cada paciente y su familia." },
      { titulo: "Monitoreo continuo de glucosa", texto: "Interpretación de reportes de MCG para ajustar el tratamiento con datos reales." },
      { titulo: "Educación en diabetes", texto: "Orientación práctica para pacientes y cuidadores sobre el manejo del día a día." },
      { titulo: "Investigación clínica", texto: "Participación en estudios y en el registro regional para avanzar en el conocimiento." },
    ],
  };
}

// Completa con la plantilla las secciones que una página creada antes todavía no tiene.
export function fusionar(plantilla, contenido) {
  const c = { ...(contenido || {}) };
  for (const k of Object.keys(plantilla)) if (c[k] === undefined) c[k] = plantilla[k];
  return c;
}

const txt = (v, max) => String(v ?? "").trim().slice(0, max);
const lista = (v, max, f) => (Array.isArray(v) ? v.slice(0, max).map(f) : []);
// Valida y recorta lo que envía el editor (nunca se guarda tal cual llega).
export function limpiarContenido(c = {}) {
  return {
    titulo: txt(c.titulo, 120),
    eslogan: txt(c.eslogan, 200),
    color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : "#0b3a6b",
    sobre_nosotros: txt(c.sobre_nosotros, 2000),
    historia: txt(c.historia, 4000),
    hitos: lista(c.hitos, 20, (h) => ({ anio: txt(h?.anio, 10), texto: txt(h?.texto, 300) })),
    equipo: lista(c.equipo, 20, (m) => ({ nombre: txt(m?.nombre, 100), cargo: txt(m?.cargo, 100), bio: txt(m?.bio, 800), foto: txt(m?.foto, 300) })),
    proyectos: lista(c.proyectos, 30, (p) => ({
      titulo: txt(p?.titulo, 150), texto: txt(p?.texto, 1200), fecha: txt(p?.fecha, 40),
      estado: ["en_curso", "proximo", "finalizado"].includes(p?.estado) ? p.estado : "en_curso",
    })),
    servicios: lista(c.servicios, 20, (s) => ({ titulo: txt(s?.titulo, 100), texto: txt(s?.texto, 500) })),
    talleres: lista(c.talleres, 30, (t) => ({ titulo: txt(t?.titulo, 150), texto: txt(t?.texto, 800), fecha: txt(t?.fecha, 40), lugar: txt(t?.lugar, 150) })),
    contacto: {
      correo: txt(c.contacto?.correo, 120), telefono: txt(c.contacto?.telefono, 40),
      whatsapp: txt(c.contacto?.whatsapp, 40), direccion: txt(c.contacto?.direccion, 250),
    },
  };
}
