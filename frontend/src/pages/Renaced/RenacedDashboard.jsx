import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import RenacedLayout from "../../components/RenacedLayout";
import FlagIcon from "../../components/FlagIcon";
import { useRenacedAuth } from "../../context/RenacedAuthContext";
import { getDashboardResumen } from "../../api/renacedApi";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
  LineChart, Line, Area, AreaChart,
} from "recharts";

const hoverCard = {
  whileHover: { y: -6, scale: 1.03, boxShadow: "0 14px 28px rgba(0,0,0,0.14)", transition: { type: "spring", stiffness: 320, damping: 22 } },
  whileTap: { scale: 0.98 },
};

/* ── Paleta ─────────────────────────────────────────────────────────────── */
const C = {
  violet:  "#6366f1",
  green:   "#22c55e",
  amber:   "#f59e0b",
  red:     "#ef4444",
  pink:    "#ec4899",
  blue:    "#3b82f6",
  purple:  "#8b5cf6",
  teal:    "#14b8a6",
  slate:   "#64748b",
  light:   "#f8fafc",
};
const TIPO_COLORS  = [C.violet, C.teal, C.amber, C.red, C.purple, C.green];
const PIE_CONTROL  = [
  { name: "Óptimo < 7%",   key: "optimo",   fill: C.green  },
  { name: "Moderado 7–9%", key: "moderado", fill: C.amber  },
  { name: "Alto > 9%",     key: "alto",     fill: C.red    },
];

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, accent = C.violet, icon }) {
  return (
    <motion.div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "20px 20px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        borderLeft: `4px solid ${accent}`,
        display: "flex", flexDirection: "column", gap: 4,
      }}
      {...hoverCard}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: accent, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
          {value ?? "—"}
        </span>
        {icon && <span style={{ fontSize: 22, marginBottom: 2, opacity: 0.5 }}>{icon}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.3 }}>{sub}</div>}
    </motion.div>
  );
}

/* ── Chart Card ──────────────────────────────────────────────────────────── */
function ChartCard({ title, badge, children, style }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "20px 20px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
      ...style,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>{title}</h3>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: C.slate, borderRadius: 20, padding: "2px 10px" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Sección label ───────────────────────────────────────────────────────── */
function SLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.09em", margin: "28px 0 12px" }}>
      {children}
    </div>
  );
}

/* ── Tooltip customizado ─────────────────────────────────────────────────── */
const tipStyle = { fontSize: 12, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.12)", border: "none" };

/* ══════════════════════════════════════════════════════════════════════════ */
export default function RenacedDashboard() {
  const { usuario } = useRenacedAuth();
  const [data, setData]         = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    getDashboardResumen()
      .then((r) => setData(r.data))
      .catch(() => setError("No se pudo conectar con la base de datos RENACED"))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <RenacedLayout><div className="loading">Cargando datos RENACED…</div></RenacedLayout>;
  if (error)    return <RenacedLayout><div className="card" style={{ color: "#dc2626", padding: 24 }}>{error}</div></RenacedLayout>;

  const { totales, por_tipo, control_hba1c, edad_dx, nuevos_por_mes, top_unidades, hba1c_recientes, eventos_resumen } = data;

  const pieControl = PIE_CONTROL.map(p => ({ ...p, value: Number(control_hba1c[p.key] || 0) }));
  const pct = (n) => control_hba1c.total_medidos
    ? `${Math.round(n * 100 / control_hba1c.total_medidos)}% del total`
    : "";

  return (
    <RenacedLayout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Dashboard RENACED</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>Registro Nacional de Diabetes Tipo 1 — {usuario?.tenant_nombre}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 20, padding: "5px 14px", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <FlagIcon codigo={usuario?.tenant} size={13} /> {usuario?.tenant_nombre}
          </span>
        </div>
      </div>

      {/* ── Registro de pacientes ────────────────────────────────────────── */}
      <SLabel>Registro de Pacientes</SLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12 }}>
        <KpiCard label="Total Pacientes"        value={totales.total_pacientes?.toLocaleString()} accent={C.violet} icon="👥" />
        <KpiCard label="Mujeres"                value={totales.mujeres?.toLocaleString()}         accent={C.pink}   icon="♀️" />
        <KpiCard label="Hombres"                value={totales.hombres?.toLocaleString()}         accent={C.blue}   icon="♂️" />
        <KpiCard label="Nuevos este mes"        value={totales.nuevos_30d?.toLocaleString()}      accent={C.purple} icon="✨"
          sub={`${totales.nuevos_anio?.toLocaleString()} en el año`} />
        <KpiCard label="Sin consulta +6 meses"  value={totales.sin_consulta?.toLocaleString()}    accent={C.amber}  icon="⚠️"
          sub="Requieren seguimiento" />
      </div>

      {/* ── Control glucémico ────────────────────────────────────────────── */}
      <SLabel>Control Glucémico (HbA1c — último resultado por paciente)</SLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12 }}>
        <KpiCard label="Promedio HbA1c"    value={control_hba1c.promedio ? `${control_hba1c.promedio}%` : "—"} accent="#0f172a"
          sub={`${control_hba1c.total_medidos?.toLocaleString()} pacientes con dato`} />
        <KpiCard label="Óptimo < 7%"       value={control_hba1c.optimo?.toLocaleString()}    accent={C.green}  sub={pct(control_hba1c.optimo)}   icon="✅" />
        <KpiCard label="Moderado 7–9%"     value={control_hba1c.moderado?.toLocaleString()}  accent={C.amber}  sub={pct(control_hba1c.moderado)} icon="📊" />
        <KpiCard label="Alto > 9%"         value={control_hba1c.alto?.toLocaleString()}      accent={C.red}    sub={pct(control_hba1c.alto)}     icon="🔴" />
      </div>

      {/* ── Eventos adversos ─────────────────────────────────────────────── */}
      <SLabel>Eventos Adversos Registrados</SLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12 }}>
        <KpiCard label="Cetoacidosis"        value={eventos_resumen?.cetoacidosis?.toLocaleString()}      accent={C.red}    icon="🏥" />
        <KpiCard label="Hipoglucemia Severa" value={eventos_resumen?.hipo_severa?.toLocaleString()}       accent={C.amber}  icon="⚡" />
        <KpiCard label="Hipoglucemia Leve"   value={eventos_resumen?.hipo_leve?.toLocaleString()}         accent="#f97316"  icon="📉" />
        <KpiCard label="Hospitalizaciones"   value={eventos_resumen?.hospitalizaciones?.toLocaleString()} accent={C.purple} icon="🏨" />
      </div>

      {/* ── Gráficas fila 1 ──────────────────────────────────────────────── */}
      <SLabel>Distribución y Control</SLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Tipo de DM */}
        <ChartCard title="Tipo de Diabetes">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={por_tipo} dataKey="total" nameKey="tipo"
                cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                {por_tipo.map((_, i) => <Cell key={i} fill={TIPO_COLORS[i % TIPO_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v.toLocaleString()} pacientes`, n]} contentStyle={tipStyle} />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Control glucémico donut */}
        <ChartCard title="Control Glucémico por Paciente"
          badge={control_hba1c.total_medidos ? `${control_hba1c.total_medidos?.toLocaleString()} medidos` : undefined}>
          {control_hba1c.total_medidos > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieControl} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  {pieControl.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v.toLocaleString()} pac. (${pct(v)})`, n]} contentStyle={tipStyle} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "70px 0", fontSize: 13 }}>Sin datos de laboratorio</div>
          )}
        </ChartCard>
      </div>

      {/* ── Gráficas fila 2 ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

        {/* Tendencia nuevos pacientes */}
        <ChartCard title="Nuevos Pacientes" badge="Últimos 12 meses">
          {nuevos_por_mes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "70px 0", fontSize: 13 }}>Sin datos en este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={nuevos_por_mes} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.violet} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes_label" tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false}
                  interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v, "Pacientes"]} />
                <Area type="monotone" dataKey="n" stroke={C.violet} strokeWidth={2.5}
                  fill="url(#gradViolet)" dot={{ r: 3.5, fill: C.violet, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Edad al diagnóstico */}
        <ChartCard title="Edad al Diagnóstico" badge="años">
          {edad_dx.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "70px 0", fontSize: 13 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={edad_dx} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="rango" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v.toLocaleString(), "Pacientes"]}
                  cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="n" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {edad_dx.map((_, i) => (
                    <Cell key={i} fill={i === edad_dx.reduce((mi, r, ri, a) => r.n > a[mi].n ? ri : mi, 0)
                      ? C.violet : "#c7d2fe"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Gráficas fila 3 ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, marginBottom: 24 }}>

        {/* Top unidades */}
        <ChartCard title="Pacientes por Unidad Médica">
          {top_unidades.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "70px 0", fontSize: 13 }}>Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top_unidades} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="unidad" tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false}
                  width={140} tickFormatter={(v) => v.length > 24 ? v.slice(0, 24) + "…" : v} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v.toLocaleString(), "Pacientes"]}
                  cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="n" fill={C.purple} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* HbA1c recientes */}
        <ChartCard title="HbA1c — Últimos Resultados" badge="8 más recientes">
          {hba1c_recientes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "70px 0", fontSize: 13 }}>Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hba1c_recientes} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 15]} tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} unit="%" />
                  <YAxis type="category" dataKey="ap_pat" tick={{ fontSize: 10, fill: C.slate }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => [`${v}%`, "HbA1c"]} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="hba1c" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {hba1c_recientes.map((e, i) => (
                      <Cell key={i} fill={e.hba1c < 7 ? C.green : e.hba1c <= 9 ? C.amber : C.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                {[{ label: "< 7%  Óptimo", c: C.green }, { label: "7–9%  Moderado", c: C.amber }, { label: "> 9%  Alto", c: C.red }]
                  .map(({ label, c }) => (
                    <span key={label} style={{ fontSize: 11, color: C.slate, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block", flexShrink: 0 }} />
                      {label}
                    </span>
                  ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>
    </RenacedLayout>
  );
}
