import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import WeekSummaryScreen from "./WeekSummaryScreen";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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

function toMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function checkOverlaps(blocks) {
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const aStart = toMinutes(blocks[i].start_time);
      const aEnd = toMinutes(blocks[i].end_time);
      const bStart = toMinutes(blocks[j].start_time);
      const bEnd = toMinutes(blocks[j].end_time);
      if (aStart < bEnd && bStart < aEnd) {
        return `El Bloque ${i + 1} (${blocks[i].start_time}–${blocks[i].end_time}) se solapa con el Bloque ${j + 1} (${blocks[j].start_time}–${blocks[j].end_time}).`;
      }
    }
  }
  return null;
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

// ─── TimeInput sub-component ──────────────────────────────────────────────────
function TimeInput({ label, value, onChange }) {
  return (
    <div style={s.timeField}>
      <label style={s.label}>{label}</label>
      <input
        type="time"
        style={s.timeInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── EntryBlock sub-component (same as supervisors) ───────────────────────────
function EntryBlock({ block, index, projects, onChange, onRemove, canRemove }) {
  const hours = calcHours(block.start_time, block.end_time, block.lunch_minutes);

  return (
    <div style={s.entryBlock}>
      <div style={s.entryBlockHeader}>
        <span style={s.entryBlockTitle}>Bloque {index + 1}</span>
        {canRemove && (
          <button style={s.removeBlockBtn} onClick={onRemove}>✕ Eliminar</button>
        )}
      </div>

      <div style={s.timeRow}>
        <TimeInput label="Entrada" value={block.start_time} onChange={(v) => onChange("start_time", v)} />
        <TimeInput label="Salida" value={block.end_time} onChange={(v) => onChange("end_time", v)} />
      </div>

      <div style={s.lunchRow}>
        <label style={s.label}>Almuerzo</label>
        <div style={s.lunchBtns}>
          {[0, 60].map((min) => (
            <button
              key={min}
              style={{
                ...s.lunchBtn,
                background: block.lunch_minutes === min ? "#2563eb" : "#f3f4f6",
                color: block.lunch_minutes === min ? "#fff" : "#374151",
              }}
              onClick={() => onChange("lunch_minutes", min)}
            >
              {min === 0 ? "Sin almuerzo" : `${min} min`}
            </button>
          ))}
        </div>
      </div>

      <div style={s.projectField}>
        <label style={s.label}>Proyecto</label>
        <select
          style={s.select}
          value={block.project_id}
          onChange={(e) => onChange("project_id", e.target.value)}
        >
          <option value="">— Sin proyecto —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number ? `${p.number} · ` : ""}{p.name}
            </option>
          ))}
        </select>
      </div>

      {hours > 0 && (
        <div style={s.hoursPreview}>
          ⏱ {hours.toFixed(2)} horas netas
        </div>
      )}
    </div>
  );
}

// ─── PM Day Modal (now uses entrada/salida like supervisors) ──────────────────
function PMDayModal({ date, dayIndex, existingEntries, sheetId, pmId, projects, onClose, onSaved, onError }) {
  const isSunday = dayIndex === 6;

  const [blocks, setBlocks] = useState(() => {
    if (existingEntries && existingEntries.length > 0) {
      return existingEntries.map((e) => ({
        id: e.id,
        start_time: e.start_time || "",
        end_time: e.end_time || "",
        lunch_minutes: e.lunch_minutes ?? 60,
        project_id: e.project_id || "",
      }));
    }
    return [{ id: null, start_time: "07:00", end_time: "16:00", lunch_minutes: 60, project_id: "" }];
  });

  const [saving, setSaving] = useState(false);

  function updateBlock(index, field, value) {
    setBlocks((prev) => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }

  function addBlock() {
    const last = blocks[blocks.length - 1];
    setBlocks((prev) => [...prev, {
      id: null,
      start_time: last?.end_time || "13:00",
      end_time: "17:00",
      lunch_minutes: 0,
      project_id: last?.project_id || "",
    }]);
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  const totalHours = blocks.reduce((sum, b) => sum + calcHours(b.start_time, b.end_time, b.lunch_minutes), 0);

  async function handleSave() {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.start_time || !b.end_time) { onError(`Bloque ${i + 1}: entrada y salida son requeridas.`); return; }
      const h = calcHours(b.start_time, b.end_time, b.lunch_minutes);
      if (h <= 0) { onError(`Bloque ${i + 1}: la salida debe ser después de la entrada.`); return; }
    }

    if (blocks.length > 1) {
      const overlapError = checkOverlaps(blocks);
      if (overlapError) { onError(overlapError); return; }
    }

    setSaving(true);

    const existingIds = existingEntries.map((e) => e.id).filter(Boolean);
    if (existingIds.length > 0) {
      await supabase.from("time_entries").delete().in("id", existingIds);
    }

    const toInsert = blocks.map((b) => ({
      sheet_id: sheetId,
      employee_id: pmId,
      work_date: date,
      start_time: b.start_time,
      end_time: b.end_time,
      lunch_minutes: b.lunch_minutes,
      project_id: b.project_id || null,
      total_hours: calcHours(b.start_time, b.end_time, b.lunch_minutes),
    }));

    const { error } = await supabase.from("time_entries").insert(toInsert);
    setSaving(false);
    if (error) { onError("Error al guardar: " + error.message); return; }
    onSaved();
  }

  async function handleClear() {
    if (existingEntries.length === 0) { onClose(); return; }
    setSaving(true);
    const ids = existingEntries.map((e) => e.id).filter(Boolean);
    if (ids.length > 0) await supabase.from("time_entries").delete().in("id", ids);
    setSaving(false);
    onSaved();
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("es-PR", {
    weekday: "long", month: "long", day: "numeric"
  });

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h3 style={s.modalTitle}>Mis Horas</h3>
            <p style={s.modalDate}>
              {dateLabel}
              {isSunday && <span style={s.sundayTag}> · OT×2</span>}
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.blocksContainer}>
          {blocks.map((block, i) => (
            <EntryBlock
              key={i}
              block={block}
              index={i}
              projects={projects}
              onChange={(field, value) => updateBlock(i, field, value)}
              onRemove={() => removeBlock(i)}
              canRemove={blocks.length > 1}
            />
          ))}
        </div>

        <button style={s.addBlockBtn} onClick={addBlock}>
          + Agregar bloque de horas
        </button>

        {totalHours > 0 && (
          <div style={s.totalRow}>
            <span style={s.totalLabel}>Total del día:</span>
            <span style={s.totalHours}>{totalHours.toFixed(2)} horas</span>
            {isSunday && <span style={s.sundayNote}>(todas OT×2)</span>}
          </div>
        )}

        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>

        {existingEntries.length > 0 && (
          <button style={s.clearBtn} onClick={handleClear} disabled={saving}>
            🗑 Borrar horas de este día
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main PM Week Screen ───────────────────────────────────────────────────────
export default function PMWeekScreen({ user }) {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalDay, setModalDay] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchAll(); }, [weekStart]);

  async function fetchAll() {
    setLoading(true);

    const { data: projData } = await supabase
      .from("projects")
      .select("id, number, name")
      .eq("is_active", true)
      .order("name");
    setProjects(projData || []);

    const weekStr = toDateStr(weekStart);
    let { data: sheetData } = await supabase
      .from("weekly_sheets")
      .select("*")
      .eq("owner_id", user.id)
      .eq("owner_type", "pm")
      .eq("week_start", weekStr)
      .single();

    if (!sheetData) {
      const { data: newSheet } = await supabase
        .from("weekly_sheets")
        .insert([{ owner_id: user.id, owner_type: "pm", week_start: weekStr, status: "draft" }])
        .select()
        .single();
      sheetData = newSheet;
    }
    setSheet(sheetData);

    if (sheetData) {
      const weekEnd = toDateStr(addDays(weekStart, 6));
      const { data: entriesData } = await supabase
        .from("time_entries")
        .select("*")
        .eq("sheet_id", sheetData.id)
        .eq("employee_id", user.id)
        .gte("work_date", weekStr)
        .lte("work_date", weekEnd);
      setEntries(entriesData || []);
    }

    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function getEntriesForDay(dayIndex) {
    const date = toDateStr(addDays(weekStart, dayIndex));
    return entries.filter((e) => e.work_date === date);
  }

  function getHoursForDay(dayIndex) {
    return getEntriesForDay(dayIndex).reduce((sum, e) =>
      sum + calcHours(e.start_time, e.end_time, e.lunch_minutes), 0);
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isLocked = sheet?.status === "submitted" || sheet?.status === "approved";
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getWeekStart());
  const otInfo = calcWeekOT(entries);

  // Pass the PM as the single "member" to WeekSummaryScreen
  const pmAsMember = [{ id: user.id, full_name: user.full_name }];

  if (showSummary) {
    return (
      <WeekSummaryScreen
        user={user}
        sheet={sheet}
        entries={entries}
        members={pmAsMember}
        projects={projects}
        onBack={() => setShowSummary(false)}
        onSigned={() => { setShowSummary(false); fetchAll(); showToast("Hoja firmada y enviada ✓"); }}
      />
    );
  }

  if (loading) return <div style={s.page}><p style={s.loadingText}>Cargando...</p></div>;

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.headerBox}>
        <div style={s.topRow}>
          <div style={s.screenTitle}>🕐 Mis Horas</div>
          <button style={s.summaryBtn} onClick={() => setShowSummary(true)}>
            {isLocked ? "📄 Ver Resumen" : "✍️ Resumen y Firmar"}
          </button>
        </div>

        <div style={s.weekNav}>
          <button style={s.navBtn} onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
          <div style={s.weekLabel}>
            <span style={s.weekDates}>
              {weekDates[0].toLocaleDateString("es-PR", { month: "short", day: "numeric" })} —{" "}
              {weekDates[6].toLocaleDateString("es-PR", { month: "short", day: "numeric" })}
            </span>
            {isCurrentWeek && <span style={s.currentBadge}>Esta semana</span>}
          </div>
          <button style={s.navBtn} onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
        </div>

        {otInfo.total > 0 && (
          <div style={s.otSummary}>
            <span style={s.otReg}>{otInfo.regular.toFixed(1)}h reg</span>
            {otInfo.ot15 > 0 && <span style={s.otOT15}> · {otInfo.ot15.toFixed(1)}h OT×1.5</span>}
            {otInfo.ot2 > 0 && <span style={s.otOT2}> · {otInfo.ot2.toFixed(1)}h OT×2</span>}
            <span style={s.otTotal}> = {otInfo.total.toFixed(1)}h total</span>
          </div>
        )}

        <div style={s.statusRow}>
          <span style={{
            ...s.statusBadge,
            background: sheet?.status === "approved" ? "#dcfce7" : sheet?.status === "submitted" ? "#dbeafe" : "#f3f4f6",
            color: sheet?.status === "approved" ? "#166534" : sheet?.status === "submitted" ? "#1e40af" : "#6b7280",
          }}>
            {sheet?.status === "approved" ? "✅ Aprobada" : sheet?.status === "submitted" ? "📤 Enviada" : "✏️ Borrador"}
          </span>
        </div>

        {isLocked && (
          <div style={s.lockedBanner}>🔒 Hoja {sheet.status === "approved" ? "aprobada" : "enviada"} — solo lectura</div>
        )}
      </div>

      {/* Day grid */}
      <div style={s.dayGrid}>
        {DAYS.map((day, i) => {
          const date = weekDates[i];
          const hours = getHoursForDay(i);
          const dayEntries = getEntriesForDay(i);
          const isSun = i === 6;
          const isToday = toDateStr(date) === toDateStr(new Date());
          const projectNames = dayEntries
            .map((e) => {
              const p = projects.find((p) => p.id === e.project_id);
              return p ? (p.number || p.name) : null;
            })
            .filter(Boolean);

          return (
            <button
              key={i}
              style={{
                ...s.dayCard,
                background: hours > 0 ? (isSun ? "#fff7f7" : "#f0fdf4") : "#fff",
                border: isToday ? "2px solid #2563eb" : "1px solid #e5e7eb",
                cursor: isLocked ? "default" : "pointer",
              }}
              onClick={() => !isLocked && setModalDay(i)}
            >
              <div style={s.dayCardTop}>
                <span style={{ ...s.dayName, color: isSun ? "#dc2626" : "#6b7280" }}>{day.slice(0, 3)}</span>
                <span style={s.dayDate}>{date.getDate()}</span>
              </div>
              {hours > 0 ? (
                <>
                  <div style={s.dayHours}>{hours.toFixed(1)}h</div>
                  {projectNames.length > 0 && (
                    <div style={s.dayProject}>{projectNames[0]}</div>
                  )}
                </>
              ) : (
                <div style={s.dayEmpty}>{isLocked ? "—" : "+ Agregar"}</div>
              )}
            </button>
          );
        })}
      </div>

      {modalDay !== null && (
        <PMDayModal
          date={toDateStr(addDays(weekStart, modalDay))}
          dayIndex={modalDay}
          existingEntries={getEntriesForDay(modalDay)}
          sheetId={sheet?.id}
          pmId={user.id}
          projects={projects}
          onClose={() => setModalDay(null)}
          onSaved={() => { fetchAll(); showToast("Guardado ✓"); setModalDay(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingText: { textAlign: "center", color: "#9ca3af", marginTop: "40px" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  headerBox: { marginBottom: "16px" },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  screenTitle: { fontSize: "18px", fontWeight: "600", color: "#111827" },
  summaryBtn: { background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  weekNav: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  navBtn: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", width: "32px", height: "32px", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" },
  weekLabel: { flex: 1, display: "flex", alignItems: "center", gap: "8px" },
  weekDates: { fontSize: "14px", fontWeight: "500", color: "#374151" },
  currentBadge: { fontSize: "11px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "6px", padding: "2px 7px", fontWeight: "500" },
  otSummary: { fontSize: "12px", marginBottom: "6px" },
  otReg: { color: "#16a34a", fontWeight: "500" },
  otOT15: { color: "#d97706", fontWeight: "500" },
  otOT2: { color: "#dc2626", fontWeight: "500" },
  otTotal: { color: "#374151", fontWeight: "600" },
  statusRow: { marginBottom: "6px" },
  statusBadge: { fontSize: "11px", fontWeight: "600", borderRadius: "6px", padding: "3px 8px" },
  lockedBanner: { background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#92400e" },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" },
  dayCard: { borderRadius: "12px", padding: "10px 6px", textAlign: "center", fontFamily: "inherit", cursor: "pointer", minHeight: "80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: "4px" },
  dayCardTop: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" },
  dayName: { fontSize: "9px", fontWeight: "600", textTransform: "uppercase" },
  dayDate: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  dayHours: { fontSize: "13px", fontWeight: "700", color: "#111827" },
  dayProject: { fontSize: "9px", color: "#16a34a", fontWeight: "500" },
  dayEmpty: { fontSize: "10px", color: "#d1d5db" },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { fontSize: "17px", fontWeight: "600", color: "#111827", margin: "0 0 2px 0" },
  modalDate: { fontSize: "13px", color: "#6b7280", margin: 0, textTransform: "capitalize" },
  sundayTag: { color: "#dc2626", fontWeight: "600" },
  closeBtn: { background: "none", border: "none", fontSize: "20px", color: "#6b7280", cursor: "pointer", padding: "4px" },
  blocksContainer: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" },
  entryBlock: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" },
  entryBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  entryBlockTitle: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  removeBlockBtn: { fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" },
  timeRow: { display: "flex", gap: "10px", marginBottom: "12px" },
  timeField: { flex: 1 },
  label: { display: "block", fontSize: "11px", fontWeight: "500", color: "#6b7280", marginBottom: "4px" },
  timeInput: { width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fff" },
  lunchRow: { marginBottom: "12px" },
  lunchBtns: { display: "flex", gap: "6px", marginTop: "4px" },
  lunchBtn: { flex: 1, padding: "9px 4px", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  projectField: { marginBottom: "8px" },
  select: { width: "100%", padding: "9px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", background: "#fff", outline: "none" },
  hoursPreview: { fontSize: "12px", color: "#16a34a", fontWeight: "500", textAlign: "right" },
  addBlockBtn: { width: "100%", padding: "11px", background: "#f0fdf4", color: "#16a34a", border: "1px dashed #86efac", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", marginBottom: "14px" },
  totalRow: { display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" },
  totalLabel: { fontSize: "13px", color: "#374151", flex: 1 },
  totalHours: { fontSize: "16px", fontWeight: "700", color: "#16a34a" },
  sundayNote: { fontSize: "11px", color: "#dc2626", fontWeight: "500" },
  saveBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginBottom: "10px" },
  clearBtn: { width: "100%", padding: "11px", background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
};