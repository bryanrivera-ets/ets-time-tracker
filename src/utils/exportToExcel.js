import * as XLSX from "xlsx";

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

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-PR", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

/**
 * Export a weekly sheet to Excel with two sheets:
 * - "Resumen" — one row per employee with totals
 * - "Detalle" — one row per day per employee
 *
 * @param {object} params
 * @param {object} params.sheet - weekly_sheet record
 * @param {array}  params.entries - time_entries for this sheet
 * @param {array}  params.members - employees in this sheet
 * @param {array}  params.projects - all projects
 * @param {string} params.ownerName - brigade or PM name
 */
export function exportSheetToExcel({ sheet, entries, members, projects, ownerName }) {
  const weekStart = new Date(sheet.week_start + "T12:00:00");
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} al ${weekEnd.toLocaleDateString("es-PR", { month: "short", day: "numeric", year: "numeric" })}`;
  const fileName = `ETS_Horas_${ownerName.replace(/\s+/g, "_")}_${sheet.week_start}.xlsx`;

  // ── Sheet 1: Resumen ────────────────────────────────────────────────────────
  const resumenHeader = [
    ["ETS Corporation — Reporte de Horas"],
    [ownerName],
    [`Semana: ${weekLabel}`],
    [`Estado: ${sheet.status === "approved" ? "Aprobada" : "Enviada"}`],
    [`Firmada por: ${sheet.signature || "—"}`],
    [],
    ["Empleado", "Horas Regulares", "OT ×1.5", "OT ×2", "Total Horas", "Proyectos"],
  ];

  const resumenRows = members.map((emp) => {
    const empEntries = entries.filter((e) => e.employee_id === emp.id);
    const ot = calcWeekOT(empEntries);
    const projectIds = [...new Set(empEntries.map((e) => e.project_id).filter(Boolean))];
    const projectNames = projectIds.map((pid) => {
      const p = projects.find((p) => p.id === pid);
      return p ? (p.number ? `${p.number} - ${p.name}` : p.name) : "Sin proyecto";
    }).join(", ") || "Sin proyecto";

    return [
      emp.full_name,
      +ot.regular.toFixed(2),
      +ot.ot15.toFixed(2),
      +ot.ot2.toFixed(2),
      +ot.total.toFixed(2),
      projectNames,
    ];
  });

  // Totals row
  const totals = members.reduce((acc, emp) => {
    const empEntries = entries.filter((e) => e.employee_id === emp.id);
    const ot = calcWeekOT(empEntries);
    acc.regular += ot.regular;
    acc.ot15 += ot.ot15;
    acc.ot2 += ot.ot2;
    acc.total += ot.total;
    return acc;
  }, { regular: 0, ot15: 0, ot2: 0, total: 0 });

  resumenRows.push([
    "TOTAL",
    +totals.regular.toFixed(2),
    +totals.ot15.toFixed(2),
    +totals.ot2.toFixed(2),
    +totals.total.toFixed(2),
    "",
  ]);

  const wsResumen = XLSX.utils.aoa_to_sheet([...resumenHeader, ...resumenRows]);

  // Column widths for Resumen
  wsResumen["!cols"] = [
    { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 40 },
  ];

  // ── Sheet 2: Detalle ────────────────────────────────────────────────────────
  const detalleHeader = [
    ["ETS Corporation — Detalle de Horas"],
    [ownerName],
    [`Semana: ${weekLabel}`],
    [],
    ["Empleado", "Fecha", "Día", "Entrada", "Salida", "Almuerzo (min)", "Horas Netas", "Proyecto"],
  ];

  const detalleRows = [];
  const sortedEntries = [...entries].sort((a, b) =>
    a.work_date.localeCompare(b.work_date) || a.employee_id.localeCompare(b.employee_id)
  );

  for (const entry of sortedEntries) {
    const emp = members.find((m) => m.id === entry.employee_id);
    const proj = projects.find((p) => p.id === entry.project_id);
    const hours = entry.total_hours
      ? entry.total_hours
      : calcHours(entry.start_time, entry.end_time, entry.lunch_minutes);
    const d = new Date(entry.work_date + "T12:00:00");
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    detalleRows.push([
      emp?.full_name || "Desconocido",
      entry.work_date,
      dayNames[d.getDay()],
      entry.start_time ? entry.start_time.slice(0, 5) : "—",
      entry.end_time ? entry.end_time.slice(0, 5) : "—",
      entry.lunch_minutes ?? 0,
      +hours.toFixed(2),
      proj ? (proj.number ? `${proj.number} - ${proj.name}` : proj.name) : "Sin proyecto",
    ]);
  }

  const wsDetalle = XLSX.utils.aoa_to_sheet([...detalleHeader, ...detalleRows]);

  // Column widths for Detalle
  wsDetalle["!cols"] = [
    { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 40 },
  ];

  // ── Workbook ────────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

  XLSX.writeFile(wb, fileName);
}
