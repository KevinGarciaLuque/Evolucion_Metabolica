// Anticuerpos de diabetes: lista fija de 5 marcadores con estado Positivo/Negativo/Pendiente.
// Se guardan serializados en el campo de texto `anticuerpos` del paciente (sin migración de BD).

export const LISTA_ANTICUERPOS = [
  { key: "Anti-GAD65", label: "Anti-GAD65" },
  { key: "Anti-IA2",   label: "Anti-IA2" },
  { key: "ZnT8",       label: "ZnT8" },
  { key: "ICA",        label: "ICA" },
  { key: "IAA",        label: "IAA" },
];

// Positivo = hay autoinmunidad (hallazgo de alerta) → rojo.
// Negativo = no hay autoanticuerpos (hallazgo tranquilizador) → verde.
export const ESTADOS_ANTICUERPO = [
  { key: "Positivo",  color: "#FB0D0A" },
  { key: "Negativo",  color: "#76B250" },
  { key: "Pendiente", color: "#94a3b8" },
];

export const COLOR_ESTADO_ANTICUERPO = ESTADOS_ANTICUERPO.reduce(
  (acc, e) => ({ ...acc, [e.key]: e.color }), {}
);

export function parseAnticuerpos(str) {
  const estado = {};
  LISTA_ANTICUERPOS.forEach((a) => { estado[a.key] = "Pendiente"; });
  if (str) {
    str.split(",").forEach((parte) => {
      const [k, v] = parte.split(":").map((s) => s.trim());
      const match = LISTA_ANTICUERPOS.find((a) => a.key === k);
      if (match && v) estado[match.key] = v;
    });
  }
  return estado;
}

export function serializarAnticuerpos(estado) {
  return LISTA_ANTICUERPOS.map((a) => `${a.key}: ${estado[a.key]}`).join(", ");
}
