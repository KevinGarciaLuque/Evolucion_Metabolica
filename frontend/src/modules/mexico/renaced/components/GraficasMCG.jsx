import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const C = { red: "#ef4444", green: "#22c55e", amber: "#f59e0b", indigo: "#6366f1", slate: "#64748b", grid: "#e2e8f0" };

const n = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
const fmt = (f) => {
  if (!f) return "";
  const [y, m, d] = String(f).slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

/** Tarjeta con el valor del último reporte y su cambio frente al anterior. */
function TarjetaCambio({ label, valor, previo, suf = "", mejorSiSube, decimales = 0 }) {
  const diff = valor != null && previo != null ? valor - previo : null;
  let color = C.slate, flecha = "•";
  if (diff !== null && diff !== 0) {
    const bueno = mejorSiSube ? diff > 0 : diff < 0;
    color = bueno ? C.green : C.red;
    flecha = diff > 0 ? "▲" : "▼";
  }
  return (
    <div style={{ flex: "1 1 140px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>
        {valor != null ? valor.toFixed(decimales) : "—"}
        <span style={{ fontSize: 12, fontWeight: 600, color: C.slate }}> {suf}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>
        {diff === null ? "Sin reporte previo" : `${flecha} ${diff > 0 ? "+" : ""}${diff.toFixed(decimales === 0 ? 0 : decimales)} ${suf} vs anterior`}
      </div>
    </div>
  );
}

function Panel({ titulo, subtitulo, children }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff", flex: "1 1 380px", minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: 12, color: C.slate, marginBottom: 8 }}>{subtitulo}</div>}
      <div style={{ width: "100%", height: 240 }}>{children}</div>
    </div>
  );
}

const tooltipStyle = { borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 };

export default function GraficasMCG({ escaneos }) {
  const datos = useMemo(
    () =>
      [...(escaneos || [])]
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        .map((e) => ({
          fecha: fmt(e.fecha),
          tbr: n(e.tbr), tir: n(e.tir), tar: n(e.tar),
          glucosa: n(e.glucosa_promedio), gmi: n(e.gmi), cv: n(e.cv),
        })),
    [escaneos]
  );

  if (datos.length === 0) return null;
  const ult = datos[datos.length - 1];
  const prev = datos.length > 1 ? datos[datos.length - 2] : {};
  const hayTendencia = datos.length >= 2;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <TarjetaCambio label="TIR (en rango)" valor={ult.tir} previo={prev.tir} suf="%" mejorSiSube />
        <TarjetaCambio label="TAR (arriba)" valor={ult.tar} previo={prev.tar} suf="%" />
        <TarjetaCambio label="TBR (abajo)" valor={ult.tbr} previo={prev.tbr} suf="%" />
        <TarjetaCambio label="Glucosa prom." valor={ult.glucosa} previo={prev.glucosa} suf="mg/dL" />
        <TarjetaCambio label="GMI" valor={ult.gmi} previo={prev.gmi} suf="%" decimales={1} />
        <TarjetaCambio label="CV" valor={ult.cv} previo={prev.cv} suf="%" decimales={1} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Panel titulo="Tiempo en rango por reporte" subtitulo="Abajo · En rango · Arriba (%)">
          <ResponsiveContainer>
            <BarChart data={datos} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tbr" name="Abajo" stackId="r" fill={C.red} maxBarSize={56} />
              <Bar dataKey="tir" name="En rango" stackId="r" fill={C.green} maxBarSize={56} />
              <Bar dataKey="tar" name="Arriba" stackId="r" fill={C.amber} radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          titulo="Glucosa promedio y GMI"
          subtitulo={hayTendencia ? "Meta GMI < 7%" : "Se verá la tendencia con 2 o más reportes"}
        >
          <ResponsiveContainer>
            <LineChart data={datos} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="g" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <YAxis yAxisId="m" orientation="right" tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="m" y={7} stroke={C.green} strokeDasharray="5 4" />
              <Line yAxisId="g" type="monotone" dataKey="glucosa" name="Glucosa (mg/dL)" stroke={C.indigo} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              <Line yAxisId="m" type="monotone" dataKey="gmi" name="GMI (%)" stroke={C.amber} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          titulo="Variabilidad glucémica (CV)"
          subtitulo={hayTendencia ? "Meta CV ≤ 36%" : "Se verá la tendencia con 2 o más reportes"}
        >
          <ResponsiveContainer>
            <LineChart data={datos} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, (max) => Math.max(50, Math.ceil(max))]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <ReferenceLine y={36} stroke={C.red} strokeDasharray="5 4" label={{ value: "36%", fontSize: 11, fill: C.red, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="cv" name="CV" stroke={C.indigo} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
