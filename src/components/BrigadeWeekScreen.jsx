import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import DayEntryModal from "./DayEntryModal";
import WeekSummaryScreen from "./WeekSummaryScreen";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
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

export default function BrigadeWeekScreen({ user }) {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [brigade, setBrigade] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchAll(); }, [weekStart]);

  async function fetchAll() {
    setLoading(true);

    const { data: brigData } = await supabase
      .from("brigades")
      .select("id, name")
      .eq("supervisor_id", user.id)
      .eq("is_active", true)
      .single();

    if (!brigData) { setLoading(false); return; }
    setBrigade(brigData);

    const { data: membData } = await supabase
      .from("brigade_members")
      .select("employee_id, employees(id, full_name)")
      .eq("brigade_id", brigData.id);

    const memberList = (membData || []).map((m) => m.employees).filter(Boolean);
    setMembers(memberList);

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
      .eq("owner_id", brigData.id)
      .eq("owner_type", "brigade")
      .eq("week_start", weekStr)
      .single();

    if (!sheetData) {
      const { data: newSheet } = await supabase
        .from("weekly_sheets")
        .insert([{ owner_id: brigData.id, owner_type: "brigade", week_start: weekStr, status: "draft" }])
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

  function getEntriesForEmployeeDay(employeeId, dayIndex) {
    const date = toDateStr(addDays(weekStart, dayIndex));
    return entries.filter((e) => e.employee_id === employeeId && e.work_date === date);
  }

  function getHoursForEmployeeDay(employeeId, dayIndex) {
    return getEntriesForEmployeeDay(employeeId, dayIndex)
      .reduce((sum, e) => sum + calcHours(e.start_time, e.end_time, e.lunch_minutes), 0);
  }

  function getTotalHoursForEmployee(employeeId) {
    return entries
      .filter((e) => e.employee_id === employeeId)
      .reduce((sum, e) => sum + calcHours(e.start_time, e.end_time, e.lunch_minutes), 0);
  }

  function openModal(employee, dayIndex) {
    if (isLocked) return;
    const date = toDateStr(addDays(weekStart, dayIndex));
    const dayEntries = getEntriesForEmployeeDay(employee.id, dayIndex);
    setModalData({ employee, date, dayIndex, existingEntries: dayEntries });
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isLocked = sheet?.status === "approved" || sheet?.status === "submitted";
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getWeekStart());
  const totalWeekHours = entries.reduce((sum, e) => sum + calcHours(e.start_time, e.end_time, e.lunch_minutes), 0);

  // Show summary screen
  if (showSummary) {
    return (
      <WeekSummaryScreen
        user={user}
        sheet={sheet}
        entries={entries}
        members={members}
        projects={projects}
        onBack={() => setShowSummary(false)}
        onSigned={() => { setShowSummary(false); fetchAll(); showToast("Hoja firmada y enviada ✓"); }}
      />
    );
  }

  if (loading) return <div style={s.page}><p style={s.loadingText}>Cargando...</p></div>;

  if (!brigade) return (
    <div style={s.page}>
      <div style={s.emptyState}>
        <p style={s.emptyIcon}>🏗</p>
        <p style={s.emptyTitle}>Sin brigada asignada</p>
        <p style={s.emptyDesc}>Contacta al administrador para que te asigne una brigada.</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {/* Brigade + week header */}
      <div style={s.headerBox}>
        <div style={s.brigadeRow}>
          <div style={s.brigadeName}>🏗 {brigade.name}</div>
          {/* Summary button */}
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

        {/* Status row */}
        <div style={s.statusRow}>
          <span style={{
            ...s.statusBadge,
            background: sheet?.status === "approved" ? "#dcfce7" : sheet?.status === "submitted" ? "#dbeafe" : "#f3f4f6",
            color: sheet?.status === "approved" ? "#166534" : sheet?.status === "submitted" ? "#1e40af" : "#6b7280",
          }}>
            {sheet?.status === "approved" ? "✅ Aprobada" : sheet?.status === "submitted" ? "📤 Enviada" : "✏️ Borrador"}
          </span>
          {totalWeekHours > 0 && (
            <span style={s.totalPill}>{totalWeekHours.toFixed(1)}h totales</span>
          )}
        </div>

        {isLocked && (
          <div style={s.lockedBanner}>
            🔒 Hoja {sheet.status === "approved" ? "aprobada" : "enviada"} — solo lectura
          </div>
        )}
      </div>

      {/* Day selector tabs */}
      <div style={s.dayTabs}>
        {DAYS.map((day, i) => {
          const date = weekDates[i];
          const isToday = toDateStr(date) === toDateStr(new Date());
          const isSun = i === 6;
          const hasEntries = members.some((m) => getHoursForEmployeeDay(m.id, i) > 0);
          return (
            <button
              key={i}
              style={{
                ...s.dayTab,
                background: selectedDay === i ? (isSun ? "#dc2626" : "#2563eb") : "#fff",
                color: selectedDay === i ? "#fff" : isSun ? "#dc2626" : "#374151",
                border: isToday ? "2px solid #2563eb" : "1px solid #e5e7eb",
                fontWeight: isToday || selectedDay === i ? "700" : "400",
              }}
              onClick={() => setSelectedDay(selectedDay === i ? null : i)}
            >
              <div style={s.dayTabName}>{day.slice(0, 3)}</div>
              <div style={s.dayTabDate}>{date.getDate()}</div>
              {hasEntries && <div style={s.dayDot} />}
            </button>
          );
        })}
      </div>

      {/* Employee list */}
      <div style={s.employeeList}>
        {members.map((emp) => {
          const totalHours = getTotalHoursForEmployee(emp.id);
          const otInfo = calcWeekOT(entries.filter((e) => e.employee_id === emp.id));
          return (
            <div key={emp.id} style={s.empBlock}>
              <div style={s.empHeader}>
                <div style={s.empAvatar}>
                  {emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div style={s.empMeta}>
                  <div style={s.empName}>{emp.full_name}</div>
                  <div style={s.empHoursSummary}>
                    <span style={s.hoursReg}>{otInfo.regular.toFixed(1)}h reg</span>
                    {otInfo.ot15 > 0 && <span style={s.hoursOT15}> · {otInfo.ot15.toFixed(1)}h OT×1.5</span>}
                    {otInfo.ot2 > 0 && <span style={s.hoursOT2}> · {otInfo.ot2.toFixed(1)}h OT×2</span>}
                  </div>
                </div>
                <div style={s.totalBadge}>{totalHours.toFixed(1)}h</div>
              </div>
              <div style={s.dayCells}>
                {Array.from({ length: 7 }, (_, i) => {
                  if (selectedDay !== null && selectedDay !== i) return null;
                  const date = weekDates[i];
                  const dayEntries = getEntriesForEmployeeDay(emp.id, i);
                  const hours = getHoursForEmployeeDay(emp.id, i);
                  const isSun = i === 6;
                  const isToday = toDateStr(date) === toDateStr(new Date());
                  return (
                    <button
                      key={i}
                      style={{
                        ...s.dayCell,
                        background: hours > 0 ? (isSun ? "#fff7f7" : "#f0fdf4") : "#f9fafb",
                        border: isToday ? "1.5px solid #2563eb" : "1px solid #e5e7eb",
                        cursor: isLocked ? "default" : "pointer",
                      }}
                      onClick={() => !isLocked && openModal(emp, i)}
                    >
                      <div style={s.dayCellDay}>
                        <span style={{ color: isSun ? "#dc2626" : "#6b7280" }}>{DAYS[i].slice(0, 3)}</span>
                        <span style={s.dayCellDate}>{date.getDate()}</span>
                      </div>
                      {hours > 0 ? (
                        <>
                          <div style={s.dayCellHours}>{hours.toFixed(1)}h</div>
                          {dayEntries[0] && (
                            <div style={s.dayCellTime}>
                              {dayEntries[0].start_time?.slice(0, 5)} – {dayEntries[0].end_time?.slice(0, 5)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={s.dayCellEmpty}>{isLocked ? "—" : "+ Horas"}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {modalData && (
        <DayEntryModal
          employee={modalData.employee}
          date={modalData.date}
          dayIndex={modalData.dayIndex}
          existingEntries={modalData.existingEntries}
          sheetId={sheet?.id}
          projects={projects}
          onClose={() => setModalData(null)}
          onSaved={() => { fetchAll(); showToast("Guardado ✓"); setModalData(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loadingText: { textAlign: "center", color: "#9ca3af", marginTop: "40px" },
  emptyState: { textAlign: "center", padding: "60px 16px" },
  emptyIcon: { fontSize: "48px", margin: "0 0 8px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 4px" },
  emptyDesc: { fontSize: "13px", color: "#9ca3af" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  headerBox: { marginBottom: "12px" },
  brigadeRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  brigadeName: { fontSize: "16px", fontWeight: "600", color: "#111827" },
  summaryBtn: { background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  weekNav: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  navBtn: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", width: "32px", height: "32px", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" },
  weekLabel: { flex: 1, display: "flex", alignItems: "center", gap: "8px" },
  weekDates: { fontSize: "14px", fontWeight: "500", color: "#374151" },
  currentBadge: { fontSize: "11px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "6px", padding: "2px 7px", fontWeight: "500" },
  statusRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" },
  statusBadge: { fontSize: "11px", fontWeight: "600", borderRadius: "6px", padding: "3px 8px" },
  totalPill: { fontSize: "11px", color: "#374151", background: "#f3f4f6", borderRadius: "6px", padding: "3px 8px" },
  lockedBanner: { background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#92400e" },
  dayTabs: { display: "flex", gap: "4px", marginBottom: "12px", overflowX: "auto", paddingBottom: "2px" },
  dayTab: { flex: "0 0 auto", minWidth: "44px", padding: "6px 4px", borderRadius: "10px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", position: "relative" },
  dayTabName: { fontSize: "10px", fontWeight: "500", marginBottom: "2px" },
  dayTabDate: { fontSize: "14px", fontWeight: "600" },
  dayDot: { width: "4px", height: "4px", borderRadius: "50%", background: "#16a34a", margin: "2px auto 0" },
  employeeList: { display: "flex", flexDirection: "column", gap: "10px" },
  empBlock: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden" },
  empHeader: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderBottom: "1px solid #f3f4f6" },
  empAvatar: { width: "36px", height: "36px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empMeta: { flex: 1, minWidth: 0 },
  empName: { fontSize: "14px", fontWeight: "500", color: "#111827" },
  empHoursSummary: { fontSize: "11px", marginTop: "2px" },
  hoursReg: { color: "#16a34a" },
  hoursOT15: { color: "#d97706" },
  hoursOT2: { color: "#dc2626" },
  totalBadge: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  dayCells: { display: "flex", gap: "0", overflowX: "auto" },
  dayCell: { flex: "1 0 0", minWidth: "44px", padding: "8px 4px", textAlign: "center", borderRight: "1px solid #f3f4f6", fontFamily: "inherit", cursor: "pointer" },
  dayCellDay: { display: "flex", justifyContent: "center", gap: "3px", fontSize: "9px", fontWeight: "500", marginBottom: "4px", color: "#6b7280" },
  dayCellDate: { color: "#374151" },
  dayCellHours: { fontSize: "13px", fontWeight: "700", color: "#111827" },
  dayCellTime: { fontSize: "9px", color: "#9ca3af", marginTop: "2px" },
  dayCellEmpty: { fontSize: "10px", color: "#d1d5db", marginTop: "4px" },
};