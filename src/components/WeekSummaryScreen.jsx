import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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
    const hours = calcHours(entry.start_time, entry.end_time, entry.lunch_minutes);
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

export default function WeekSummaryScreen({ user, sheet, entries, members, projects, onBack, onSigned }) {
  const [signingStep, setSigningStep] = useState(null);
  const [pin, setPin] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const summaryByEmployee = members.map((emp) => {
    const empEntries = entries.filter((e) => e.employee_id === emp.id);
    const ot = calcWeekOT(empEntries);
    const projectIds = [...new Set(empEntries.map((e) => e.project_id).filter(Boolean))];
    const projectNames = projectIds.map((pid) => {
      const p = projects.find((p) => p.id === pid);
      return p ? (p.number ? `${p.number}` : p.name) : "Sin proyecto";
    });
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
    return {
      id: pid,
      name: project ? project.name : "Sin proyecto",
      number: project?.number || null,
      employeeCount: data.employeeIds.size,
      ...ot,
    };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = {
    regular: summaryByEmployee.reduce((s, e) => s + e.regular, 0),
    ot15: summaryByEmployee.reduce((s, e) => s + e.ot15, 0),
    ot2: summaryByEmployee.reduce((s, e) => s + e.ot2, 0),
    total: summaryByEmployee.reduce((s, e) => s + e.total, 0),
  };

  function handlePinKey(key) {
    if (key === "C") { setPin(""); return; }
    if (key === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    setPin((p) => p + key);
  }

  useEffect(() => {
    if (pin.length === 4) handleSign();
  }, [pin]);

  async function handleSign() {
    setSigning(true);
    setError("");

    // ✅ FIX: usar pin_attempt (nombre correcto del parámetro en la función SQL)
    const { data: validData, error: rpcError } = await supabase.rpc("validate_pin", {
      employee_id: user.id,
      pin_attempt: pin,
    });

    const isValid = !rpcError && validData !== null &&
      JSON.stringify(validData).toLowerCase().includes("acceso correcto");

    if (!isValid) {
      setPin("");
      setSigning(false);
      setError("PIN incorrecto. Intenta de nuevo.");
      return;
    }

    const { error: updateError } = await supabase
      .from("weekly_sheets")
      .update({
        status: "submitted",
        signature: user.full_name,
        signed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .eq("id", sheet.id);

    setSigning(false);
    if (updateError) { setError("Error al firmar: " + updateError.message); setPin(""); return; }

    showToast("Hoja firmada y enviada ✓");
    setTimeout(() => onSigned(), 1500);
  }

  const isLocked = sheet?.status === "submitted" || sheet?.status === "approved";
  const weekLabel = sheet?.week_start
    ? new Date(sheet.week_start + "T12:00:00").toLocaleDateString("es-PR", { month: "long", day: "numeric" })
    : "";

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>‹ Mi Brigada</button>
        <h2 style={s.title}>Resumen Semanal</h2>
        <div style={s.weekBadge}>Sem. {weekLabel}</div>
      </div>

      {isLocked && (
        <div style={{ ...s.statusBanner, background: sheet.status === "approved" ? "#dcfce7" : "#dbeafe", color: sheet.status === "approved" ? "#166534" : "#1e40af" }}>
          {sheet.status === "approved" ? "✅ Hoja aprobada" : "📤 Hoja enviada — pendiente de aprobación"}
          {sheet.signed_at && (
            <div style={s.signedAt}>
              Firmada por {sheet.signature} · {new Date(sheet.signed_at).toLocaleDateString("es-PR")}
            </div>
          )}
        </div>
      )}

      <div style={s.grandTotalCard}>
        <div style={s.grandTotalTitle}>Total de la semana</div>
        <div style={s.grandTotalHours}>{grandTotal.total.toFixed(1)}h</div>
        <div style={s.grandTotalBreakdown}>
          <span style={s.regChip}>{grandTotal.regular.toFixed(1)}h reg</span>
          {grandTotal.ot15 > 0 && <span style={s.ot15Chip}>{grandTotal.ot15.toFixed(1)}h OT×1.5</span>}
          {grandTotal.ot2 > 0 && <span style={s.ot2Chip}>{grandTotal.ot2.toFixed(1)}h OT×2</span>}
        </div>
      </div>

      <div style={s.sectionHeader}>👥 Por Empleado</div>
      <div style={s.card}>
        {summaryByEmployee.map((emp, i) => (
          <div key={emp.id} style={{ ...s.empRow, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
            <div style={s.empAvatar}>
              {emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={s.empInfo}>
              <div style={s.empName}>{emp.full_name}</div>
              <div style={s.empProjects}>{emp.projectNames.join(" · ") || "Sin proyecto"}</div>
            </div>
            <div style={s.empHours}>
              <div style={s.empTotal}>{emp.total.toFixed(1)}h</div>
              <div style={s.empBreakdown}>
                {emp.regular > 0 && <span style={{ color: "#16a34a" }}>{emp.regular.toFixed(1)}r </span>}
                {emp.ot15 > 0 && <span style={{ color: "#d97706" }}>{emp.ot15.toFixed(1)}×1.5 </span>}
                {emp.ot2 > 0 && <span style={{ color: "#dc2626" }}>{emp.ot2.toFixed(1)}×2</span>}
              </div>
            </div>
          </div>
        ))}
        {summaryByEmployee.length === 0 && <p style={s.emptyText}>No hay horas registradas esta semana.</p>}
      </div>

      <div style={s.sectionHeader}>📋 Por Proyecto</div>
      <div style={s.card}>
        {summaryByProject.map((proj, i) => (
          <div key={proj.id} style={{ ...s.projRow, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
            <div style={s.projInfo}>
              <div style={s.projName}>{proj.name}</div>
              {proj.number && <div style={s.projNumber}>{proj.number}</div>}
              <div style={s.projEmployees}>{proj.employeeCount} empleado{proj.employeeCount !== 1 ? "s" : ""}</div>
            </div>
            <div style={s.projHours}>
              <div style={s.projTotal}>{proj.total.toFixed(1)}h</div>
              <div style={s.empBreakdown}>
                {proj.regular > 0 && <span style={{ color: "#16a34a" }}>{proj.regular.toFixed(1)}r </span>}
                {proj.ot15 > 0 && <span style={{ color: "#d97706" }}>{proj.ot15.toFixed(1)}×1.5 </span>}
                {proj.ot2 > 0 && <span style={{ color: "#dc2626" }}>{proj.ot2.toFixed(1)}×2</span>}
              </div>
            </div>
          </div>
        ))}
        {summaryByProject.length === 0 && <p style={s.emptyText}>No hay horas registradas esta semana.</p>}
      </div>

      {!isLocked && grandTotal.total > 0 && signingStep === null && (
        <button style={s.signBtn} onClick={() => setSigningStep("confirm")}>
          ✍️ Firmar y Enviar Hoja
        </button>
      )}

      {signingStep === "confirm" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>¿Confirmas que las horas son correctas?</p>
          <p style={s.confirmDesc}>Una vez firmada, la hoja se enviará al aprobador y no podrás editarla.</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.confirmYes} onClick={() => setSigningStep("pin")}>Sí, firmar</button>
            <button style={s.confirmNo} onClick={() => setSigningStep(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {signingStep === "pin" && (
        <div style={s.pinBox}>
          <p style={s.pinTitle}>Ingresa tu PIN para firmar</p>
          <div style={s.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ ...s.pinDot, background: i < pin.length ? "#2563eb" : "#e5e7eb" }} />
            ))}
          </div>
          {error && <p style={s.pinError}>{error}</p>}
          <div style={s.pinGrid}>
            {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((k) => (
              <button
                key={k}
                style={{ ...s.pinKey, color: k === "C" ? "#dc2626" : k === "⌫" ? "#374151" : "#111827" }}
                onClick={() => handlePinKey(k)}
                disabled={signing}
              >
                {k}
              </button>
            ))}
          </div>
          <button style={s.cancelPinBtn} onClick={() => { setSigningStep(null); setPin(""); setError(""); }}>
            Cancelar
          </button>
        </div>
      )}

      <div style={{ height: "40px" }} />
    </div>
  );
}

const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "17px", fontWeight: "600", color: "#111827", margin: 0 },
  weekBadge: { fontSize: "11px", background: "#f3f4f6", color: "#6b7280", borderRadius: "6px", padding: "3px 8px" },
  statusBanner: { borderRadius: "12px", padding: "12px 14px", marginBottom: "14px", fontSize: "13px", fontWeight: "500" },
  signedAt: { fontSize: "11px", fontWeight: "400", marginTop: "2px", opacity: 0.8 },
  grandTotalCard: { background: "#1e40af", borderRadius: "16px", padding: "20px", marginBottom: "16px", textAlign: "center", color: "#fff" },
  grandTotalTitle: { fontSize: "12px", opacity: 0.8, marginBottom: "4px" },
  grandTotalHours: { fontSize: "40px", fontWeight: "700", margin: "0 0 8px" },
  grandTotalBreakdown: { display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" },
  regChip: { background: "rgba(255,255,255,0.2)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  ot15Chip: { background: "rgba(251,191,36,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  ot2Chip: { background: "rgba(239,68,68,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" },
  sectionHeader: { fontSize: "12px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.05em", margin: "0 0 8px 2px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", marginBottom: "16px" },
  empRow: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px" },
  empAvatar: { width: "34px", height: "34px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empInfo: { flex: 1, minWidth: 0 },
  empName: { fontSize: "13px", fontWeight: "500", color: "#111827" },
  empProjects: { fontSize: "11px", color: "#9ca3af", marginTop: "1px" },
  empHours: { textAlign: "right" },
  empTotal: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  empBreakdown: { fontSize: "10px", marginTop: "1px" },
  projRow: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px" },
  projInfo: { flex: 1, minWidth: 0 },
  projName: { fontSize: "13px", fontWeight: "500", color: "#111827" },
  projNumber: { fontSize: "11px", color: "#16a34a", fontWeight: "500" },
  projEmployees: { fontSize: "11px", color: "#9ca3af" },
  projHours: { textAlign: "right" },
  projTotal: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "16px" },
  signBtn: { width: "100%", padding: "15px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginBottom: "12px" },
  confirmBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginBottom: "12px" },
  confirmTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 6px 0" },
  confirmDesc: { fontSize: "13px", color: "#6b7280", margin: "0 0 14px 0" },
  confirmYes: { flex: 1, padding: "11px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { flex: 1, padding: "11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  pinBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px 16px", marginBottom: "12px" },
  pinTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", textAlign: "center", margin: "0 0 16px 0" },
  pinDots: { display: "flex", justifyContent: "center", gap: "12px", marginBottom: "12px" },
  pinDot: { width: "14px", height: "14px", borderRadius: "50%", transition: "background 0.15s" },
  pinError: { color: "#dc2626", fontSize: "13px", textAlign: "center", margin: "0 0 10px 0" },
  pinGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxWidth: "280px", margin: "0 auto 14px" },
  pinKey: { padding: "14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "20px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  cancelPinBtn: { width: "100%", padding: "10px", background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
};