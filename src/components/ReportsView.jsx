import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function calcHours(start, end, lunch) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return Math.max(0, (endMin - startMin - (lunch || 0)) / 60);
}

function calcEntryHours(entry) {
  return entry.total_hours || calcHours(entry.start_time, entry.end_time, entry.lunch_minutes);
}

function calcWeekOT(entries) {
  let regular = 0, ot15 = 0, ot2 = 0;
  let weeklyRegularBank = 0;
  const sorted = [...entries].sort((a, b) => a.work_date.localeCompare(b.work_date));
  for (const entry of sorted) {
    const isSunday = new Date(entry.work_date + "T12:00:00").getDay() === 0;
    const hours = calcEntryHours(entry);
    if (isSunday) {
      ot2 += hours;
    } else {
      const remainingRegular = Math.max(0, 40 - weeklyRegularBank);
      const reg = Math.min(hours, remainingRegular);
      const ot = Math.max(0, hours - remainingRegular);
      regular += reg;
      ot15 += ot;
      weeklyRegularBank += reg;
    }
  }
  return { regular, ot15, ot2, total: regular + ot15 + ot2 };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
      <p style={{ fontWeight: "600", color: "#111827", margin: "0 0 4px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>{p.name}: {Number(p.value).toFixed(1)}h</p>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ ...s.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={s.statIcon}>{icon}</div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
        {sub && <div style={s.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main ReportsView ─────────────────────────────────────────────────────────
export default function ReportsView({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [weeks, setWeeks] = useState([]); // last 4 week starts

  useEffect(() => {
    // Build last 4 weeks
    const currentWeekStart = getWeekStart();
    const last4 = Array.from({ length: 4 }, (_, i) => addDays(currentWeekStart, -i * 7)).reverse();
    setWeeks(last4);
    fetchData(last4);
  }, []);

  async function fetchData(last4) {
    setLoading(true);
    const fromDate = toDateStr(last4[0]);
    const toDate = toDateStr(addDays(last4[last4.length - 1], 6));

    const [
      { data: entriesData },
      { data: sheetsData },
      { data: empData },
      { data: projData },
    ] = await Promise.all([
      supabase.from("time_entries").select("*").gte("work_date", fromDate).lte("work_date", toDate),
      supabase.from("weekly_sheets").select("id, status, week_start, owner_type, owner_id").in("status", ["submitted", "approved", "draft"]),
      supabase.from("employees").select("id, full_name").eq("is_active", true),
      supabase.from("projects").select("id, number, name"),
    ]);

    setEntries(entriesData || []);
    setSheets(sheetsData || []);
    setEmployees(empData || []);
    setProjects(projData || []);
    setLoading(false);
  }

  if (loading) return <div style={s.page}><p style={s.loadingText}>Cargando dashboard...</p></div>;

  // ── Stat calculations ───────────────────────────────────────────────────────
  const totalHours = entries.reduce((sum, e) => sum + calcEntryHours(e), 0);
  const otInfo = calcWeekOT(entries);
  const totalOT = otInfo.ot15 + otInfo.ot2;
  const pendingSheets = sheets.filter((s) => s.status === "submitted").length;
  const approvedSheets = sheets.filter((s) => s.status === "approved").length;

  // ── Chart 1: Hours by Project ───────────────────────────────────────────────
  const projectHoursMap = {};
  for (const entry of entries) {
    const pid = entry.project_id || "none";
    if (!projectHoursMap[pid]) projectHoursMap[pid] = 0;
    projectHoursMap[pid] += calcEntryHours(entry);
  }
  const projectChartData = Object.entries(projectHoursMap)
    .map(([pid, hours]) => {
      const proj = projects.find((p) => p.id === pid);
      return { name: proj ? (proj.number || proj.name).slice(0, 20) : "Sin proyecto", hours: +hours.toFixed(1) };
    })
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  // ── Chart 2: Hours by Employee ──────────────────────────────────────────────
  const empHoursMap = {};
  for (const entry of entries) {
    const eid = entry.employee_id;
    if (!empHoursMap[eid]) empHoursMap[eid] = 0;
    empHoursMap[eid] += calcEntryHours(entry);
  }
  const empChartData = Object.entries(empHoursMap)
    .map(([eid, hours]) => {
      const emp = employees.find((e) => e.id === eid);
      const name = emp ? emp.full_name.split(" ").slice(0, 2).join(" ") : "Desconocido";
      return { name, hours: +hours.toFixed(1) };
    })
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // ── Chart 3: OT Evolution by Week ──────────────────────────────────────────
  const otByWeek = weeks.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const wStr = toDateStr(weekStart);
    const wEndStr = toDateStr(weekEnd);
    const weekEntries = entries.filter((e) => e.work_date >= wStr && e.work_date <= wEndStr);

    // Group by employee to calc OT properly
    const empIds = [...new Set(weekEntries.map((e) => e.employee_id))];
    let weekOT15 = 0, weekOT2 = 0, weekReg = 0;
    for (const eid of empIds) {
      const empEntries = weekEntries.filter((e) => e.employee_id === eid);
      const ot = calcWeekOT(empEntries);
      weekReg += ot.regular;
      weekOT15 += ot.ot15;
      weekOT2 += ot.ot2;
    }

    const label = weekStart.toLocaleDateString("es-PR", { month: "short", day: "numeric" });
    return {
      semana: label,
      Regular: +weekReg.toFixed(1),
      "OT ×1.5": +weekOT15.toFixed(1),
      "OT ×2": +weekOT2.toFixed(1),
    };
  });

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.title}>Reportes</h2>
        <div style={s.periodBadge}>Últimas 4 semanas</div>
      </div>

      {/* Stat cards */}
      <div style={s.statsGrid}>
        <StatCard icon="⏱" label="Total horas" value={`${totalHours.toFixed(0)}h`} color="#2563eb" />
        <StatCard icon="🔥" label="Total OT" value={`${totalOT.toFixed(0)}h`} sub={`${otInfo.ot15.toFixed(0)}h ×1.5 · ${otInfo.ot2.toFixed(0)}h ×2`} color="#d97706" />
        <StatCard icon="⏳" label="Pendientes" value={pendingSheets} color="#dc2626" />
        <StatCard icon="✅" label="Aprobadas" value={approvedSheets} color="#16a34a" />
      </div>

      {/* Chart 1: By Project */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>📋 Horas por Proyecto</div>
        {projectChartData.length === 0 ? (
          <p style={s.emptyChart}>Sin datos para mostrar.</p>
        ) : (
          <ResponsiveContainer width="100%" height={projectChartData.length * 36 + 20}>
            <BarChart data={projectChartData} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" name="Horas" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 2: By Employee */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>👥 Horas por Empleado</div>
        {empChartData.length === 0 ? (
          <p style={s.emptyChart}>Sin datos para mostrar.</p>
        ) : (
          <ResponsiveContainer width="100%" height={empChartData.length * 36 + 20}>
            <BarChart data={empChartData} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" name="Horas" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart 3: OT Evolution */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>📈 Evolución de Horas por Semana</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={otByWeek} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="Regular" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="OT ×1.5" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="OT ×2" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: "40px" }} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingText: { textAlign: "center", color: "#9ca3af", marginTop: "40px", fontSize: "14px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  periodBadge: { fontSize: "11px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "6px", padding: "3px 8px", fontWeight: "500" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" },
  statCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" },
  statIcon: { fontSize: "22px" },
  statValue: { fontSize: "20px", fontWeight: "700", color: "#111827", lineHeight: 1 },
  statLabel: { fontSize: "11px", color: "#6b7280", marginTop: "2px" },
  statSub: { fontSize: "10px", color: "#9ca3af", marginTop: "2px" },
  chartCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px", marginBottom: "14px" },
  chartTitle: { fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "12px" },
  emptyChart: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "20px 0" },
};