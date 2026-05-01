import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { exportSheetToExcel } from "../utils/exportToExcel";

function calcHours(start, end, lunch) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return Math.max(0, (endMin - startMin - (lunch || 0)) / 60);
}

function calcWeekOT(entries) {
  let regular = 0, ot15 = 0, ot2 = 0;
  let weeklyRegularBank = 0;
  const sorted = [...entries].sort((a, b) => a.work_date.localeCompare(b.work_date));
  for (const entry of sorted) {
    const isSunday = new Date(entry.work_date + "T12:00:00").getDay() === 0;
    const hours = entry.total_hours
      ? entry.total_hours
      : calcHours(entry.start_time, entry.end_time, entry.lunch_minutes);
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

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function ApprovalDetailScreen({ sheet, user, onBack, onActionDone }) {
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchDetail(); }, []);

  async function fetchDetail() {
    setLoading(true);

    const { data: entriesData } = await supabase
      .from("time_entries")
      .select("*")
      .eq("sheet_id", sheet.id)
      .order("work_date");
    setEntries(entriesData || []);

    const { data: projData } = await supabase
      .from("projects")
      .select("id, number, name");
    setProjects(projData || []);

    if (sheet.owner_type === "brigade") {
      const { data: brigData } = await supabase
        .from("brigades").select("id, name").eq("id", sheet.owner_id).single();
      setOwnerName(brigData?.name || "Brigada");

      const { data: membData } = await supabase
        .from("brigade_members")
        .select("employee_id, employees(id, full_name)")
        .eq("brigade_id", sheet.owner_id);
      setMembers((membData || []).map((m) => m.employees).filter(Boolean));
    } else {
      const { data: empData } = await supabase
        .from("employees").select("id, full_name").eq("id", sheet.owner_id).single();
      setOwnerName(empData?.full_name || "PM");
      setMembers(empData ? [empData] : []);
    }

    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove() {
    setSaving(true);
    const { error } = await supabase
      .from("weekly_sheets")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user.id, rejection_note: null })
      .eq("id", sheet.id);
    setSaving(false);
    if (error) { showToast("Error al aprobar: " + error.message, "error"); return; }
    onActionDone();
  }

  async function handleReject() {
    setSaving(true);
    const { error } = await supabase
      .from("weekly_sheets")
      .update({ status: "draft", rejection_note: rejectNote.trim() || null, signed_at: null, submitted_at: null, signature: null })
      .eq("id", sheet.id);
    setSaving(false);
    if (error) { showToast("Error al rechazar: " + error.message, "error"); return; }
    onActionDone();
  }

  function handleExport() {
    try {
      exportSheetToExcel({ sheet, entries, members, projects, ownerName });
      showToast("Excel descargado ✓");
    } catch (e) {
      showToast("Error al exportar: " + e.message, "error");
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const summaryByEmployee = members.map((emp) => {
    const empEntries = entries.filter((e) => e.employee_id === emp.id);
    const ot = calcWeekOT(empEntries);
    const projectIds = [...new Set(empEntries.map((e) => e.project_id).filter(Boolean))];
    const projectNames = projectIds.map((pid) => {
      const p = projects.find((p) => p.id === pid);
      return p ? (p.number || p.name) : null;
    }).filter(Boolean);
    return { ...emp, ...ot, projectNames };
  });

  const projectMap = {};
  for (const entry of entries) {
    const pid = entry.project_id || "none";
    if (!projectMap[pid]) projectMap[pid] = { entries: [], employeeIds: new Set() };
    projectMap[pid].entries.push(entry);
    projectMap[pid].employeeIds.add(entry.employee_id);
  }
  const summaryByProject = Object.entries(projectMap).map(([pid, data]) => {
    const project = projects.find((p) => p.id === pid);
    const ot = calcWeekOT(data.entries);
    return { id: pid, name: project ? project.name : "Sin proyecto", number: project?.number || null, employeeCount: data.employeeIds.size, ...ot };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = {
    regular: summaryByEmployee.reduce((s, e) => s + e.regular, 0),
    ot15: summaryByEmployee.reduce((s, e) => s + e.ot15, 0),
    ot2: summaryByEmployee.reduce((s, e) => s + e.ot2, 0),
    total: summaryByEmployee.reduce((s, e) => s + e.total, 0),
  };

  const weekStart = new Date(sheet.week_start + "T12:00:00");
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}`;
  const isApproved = sheet.status === "approved";

  if (loading) return <div style={s.page}><p style={s.loadingText}>Cargando...</p></div>;

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>‹ Aprobaciones</button>
        <div style={s.headerRight}>
          <span style={{ ...s.statusBadge, background: isApproved ? "#dcfce7" : "#fef9c3", color: isApproved ? "#166534" : "#92400e" }}>
            {isApproved ? "✅ Aprobada" : "⏳ Pendiente"}
          </span>
        </div>
      </div>

      {/* Owner + week */}
      <div style={s.ownerCard}>
        <div style={s.ownerIcon}>{sheet.owner_type === "brigade" ? "🏗" : "👤"}</div>
        <div style={{ flex: 1 }}>
          <div style={s.ownerName}>{ownerName}</div>
          <div style={s.ownerWeek}>{weekLabel}</div>
          {sheet.signature && <div style={s.signedBy}>Firmada por {sheet.signature}</div>}
        </div>
        {/* Export button */}
        <button style={s.exportBtn} onClick={handleExport}>
          📥 Excel
        </button>
      </div>

      {/* Grand total */}
      <div style={s.grandTotalCard}>
        <div style={s.grandTotalTitle}>Total de la semana</div>
        <div style={s.grandTotalHours}>{grandTotal.total.toFixed(1)}h</div>
        <div style={s.grandTotalBreakdown}>
          <span style={s.regChip}>{grandTotal.regular.toFixed(1)}h reg</span>
          {grandTotal.ot15 > 0 && <span style={s.ot15Chip}>{grandTotal.ot15.toFixed(1)}h OT×1.5</span>}
          {grandTotal.ot2 > 0 && <span style={s.ot2Chip}>{grandTotal.ot2.toFixed(1)}h OT×2</span>}
        </div>
      </div>

      {/* By Employee */}
      <div style={s.sectionHeader}>👥 Por Empleado</div>
      <div style={s.card}>
        {summaryByEmployee.map((emp, i) => (
          <div key={emp.id} style={{ ...s.row, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
            <div style={s.avatar}>{emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
            <div style={s.rowInfo}>
              <div style={s.rowName}>{emp.full_name}</div>
              <div style={s.rowSub}>{emp.projectNames.join(" · ") || "Sin proyecto"}</div>
            </div>
            <div style={s.rowHours}>
              <div style={s.rowTotal}>{emp.total.toFixed(1)}h</div>
              <div style={s.rowBreakdown}>
                {emp.regular > 0 && <span style={{ color: "#16a34a" }}>{emp.regular.toFixed(1)}r </span>}
                {emp.ot15 > 0 && <span style={{ color: "#d97706" }}>{emp.ot15.toFixed(1)}×1.5 </span>}
                {emp.ot2 > 0 && <span style={{ color: "#dc2626" }}>{emp.ot2.toFixed(1)}×2</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* By Project */}
      <div style={s.sectionHeader}>📋 Por Proyecto</div>
      <div style={s.card}>
        {summaryByProject.map((proj, i) => (
          <div key={proj.id} style={{ ...s.row, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
            <div style={s.rowInfo}>
              <div style={s.rowName}>{proj.name}</div>
              {proj.number && <div style={s.projNumber}>{proj.number}</div>}
              <div style={s.rowSub}>{proj.employeeCount} empleado{proj.employeeCount !== 1 ? "s" : ""}</div>
            </div>
            <div style={s.rowHours}>
              <div style={s.rowTotal}>{proj.total.toFixed(1)}h</div>
              <div style={s.rowBreakdown}>
                {proj.regular > 0 && <span style={{ color: "#16a34a" }}>{proj.regular.toFixed(1)}r </span>}
                {proj.ot15 > 0 && <span style={{ color: "#d97706" }}>{proj.ot15.toFixed(1)}×1.5 </span>}
                {proj.ot2 > 0 && <span style={{ color: "#dc2626" }}>{proj.ot2.toFixed(1)}×2</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily detail */}
      <div style={s.sectionHeader}>📅 Detalle por día</div>
      <div style={s.card}>
        {entries.length === 0 ? (
          <p style={s.emptyText}>Sin entradas registradas.</p>
        ) : (
          (() => {
            const byDate = {};
            for (const e of entries) {
              if (!byDate[e.work_date]) byDate[e.work_date] = [];
              byDate[e.work_date].push(e);
            }
            return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayEntries], i) => {
              const d = new Date(date + "T12:00:00");
              const dayName = DAYS_ES[d.getDay()];
              const isSun = d.getDay() === 0;
              const dayHours = dayEntries.reduce((sum, e) =>
                sum + (e.total_hours || calcHours(e.start_time, e.end_time, e.lunch_minutes)), 0);
              return (
                <div key={date} style={{ ...s.dayRow, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
                  <div style={s.dayLabel}>
                    <span style={{ ...s.dayName, color: isSun ? "#dc2626" : "#374151" }}>{dayName}</span>
                    <span style={s.dayNum}>{d.getDate()}</span>
                  </div>
                  <div style={s.dayEntries}>
                    {dayEntries.map((e, j) => {
                      const proj = projects.find((p) => p.id === e.project_id);
                      const h = e.total_hours || calcHours(e.start_time, e.end_time, e.lunch_minutes);
                      return (
                        <div key={j} style={s.entryLine}>
                          <span style={s.entryTime}>
                            {e.start_time && e.end_time ? `${e.start_time.slice(0, 5)} – ${e.end_time.slice(0, 5)}` : `${h.toFixed(1)}h`}
                          </span>
                          {proj && <span style={s.entryProj}>{proj.number || proj.name}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={s.dayHours}>{dayHours.toFixed(1)}h</div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Action buttons */}
      {sheet.status === "submitted" && action === null && (
        <div style={s.actionRow}>
          <button style={s.approveBtn} onClick={() => setAction("approve")}>✅ Aprobar</button>
          <button style={s.rejectBtn} onClick={() => setAction("reject")}>❌ Rechazar</button>
        </div>
      )}

      {action === "approve" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>¿Confirmas la aprobación?</p>
          <p style={s.confirmDesc}>La hoja quedará aprobada y bloqueada para edición.</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.confirmYes} onClick={handleApprove} disabled={saving}>{saving ? "..." : "Sí, aprobar"}</button>
            <button style={s.confirmNo} onClick={() => setAction(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {action === "reject" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>¿Rechazar esta hoja?</p>
          <p style={s.confirmDesc}>La hoja volverá a estado Borrador para que el supervisor la corrija.</p>
          <textarea
            style={s.noteInput}
            placeholder="Motivo del rechazo (opcional)..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.rejectConfirmBtn} onClick={handleReject} disabled={saving}>{saving ? "..." : "Sí, rechazar"}</button>
            <button style={s.confirmNo} onClick={() => setAction(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {isApproved && sheet.approved_at && (
        <div style={s.approvedBanner}>
          ✅ Aprobada el {new Date(sheet.approved_at).toLocaleDateString("es-PR", { month: "long", day: "numeric", year: "numeric" })}
        </div>
      )}

      <div style={{ height: "40px" }} />
    </div>
  );
}

const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingText: { textAlign: "center", color: "#9ca3af", marginTop: "40px" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  headerRight: { },
  statusBadge: { fontSize: "12px", fontWeight: "600", borderRadius: "8px", padding: "4px 10px" },
  ownerCard: { display: "flex", alignItems: "center", gap: "12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px", marginBottom: "14px" },
  ownerIcon: { fontSize: "28px" },
  ownerName: { fontSize: "16px", fontWeight: "600", color: "#111827" },
  ownerWeek: { fontSize: "13px", color: "#6b7280" },
  signedBy: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" },
  exportBtn: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 },
  grandTotalCard: { background: "#1e40af", borderRadius: "16px", padding: "20px", marginBottom: "16px", textAlign: "center", color: "#fff" },
  grandTotalTitle: { fontSize: "12px", opacity: 0.8, marginBottom: "4px" },
  grandTotalHours: { fontSize: "40px", fontWeight: "700", margin: "0 0 8px" },
  grandTotalBreakdown: { display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" },
  regChip: { background: "rgba(255,255,255,0.2)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  ot15Chip: { background: "rgba(251,191,36,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  ot2Chip: { background: "rgba(239,68,68,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  sectionHeader: { fontSize: "12px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.05em", margin: "0 0 8px 2px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "16px" },
  row: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px" },
  avatar: { width: "34px", height: "34px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: "13px", fontWeight: "500", color: "#111827" },
  rowSub: { fontSize: "11px", color: "#9ca3af" },
  projNumber: { fontSize: "11px", color: "#16a34a", fontWeight: "500" },
  rowHours: { textAlign: "right" },
  rowTotal: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  rowBreakdown: { fontSize: "10px" },
  dayRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px" },
  dayLabel: { display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 },
  dayName: { fontSize: "10px", fontWeight: "600" },
  dayNum: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  dayEntries: { flex: 1, display: "flex", flexDirection: "column", gap: "2px" },
  entryLine: { display: "flex", alignItems: "center", gap: "6px" },
  entryTime: { fontSize: "12px", color: "#374151" },
  entryProj: { fontSize: "11px", color: "#16a34a", background: "#dcfce7", borderRadius: "4px", padding: "1px 5px" },
  dayHours: { fontSize: "14px", fontWeight: "700", color: "#111827", flexShrink: 0 },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "16px" },
  actionRow: { display: "flex", gap: "10px", marginBottom: "12px" },
  approveBtn: { flex: 1, padding: "14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  rejectBtn: { flex: 1, padding: "14px", background: "#fff", color: "#dc2626", border: "2px solid #fecaca", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  confirmBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginBottom: "12px" },
  confirmTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 6px 0" },
  confirmDesc: { fontSize: "13px", color: "#6b7280", margin: "0 0 12px 0" },
  noteInput: { width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", marginBottom: "12px", boxSizing: "border-box", outline: "none" },
  confirmYes: { flex: 1, padding: "11px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  rejectConfirmBtn: { flex: 1, padding: "11px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { flex: 1, padding: "11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  approvedBanner: { background: "#dcfce7", border: "1px solid #86efac", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", color: "#166534", fontWeight: "500", marginBottom: "12px" },
};