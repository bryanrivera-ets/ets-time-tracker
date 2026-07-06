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

/**
 * Export a weekly sheet to Excel with two sheets:
 * - "Resumen" — one row per employee with totals (Total por empleado y fila TOTAL con fórmulas)
 * - "Detalle" — one row per day per employee (Horas Netas con fórmula)
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
      +ot.total.toFixed(2), // se reemplaza por fórmula abajo
      projectNames,
    ];
  });

  // Totals row (los valores se reemplazan por fórmulas SUM abajo)
  resumenRows.push(["TOTAL", 0, 0, 0, 0, ""]);

  const wsResumen = XLSX.utils.aoa_to_sheet([...resumenHeader, ...resumenRows]);

  // ── Fórmulas en Resumen ──
  // Los datos de empleados empiezan en la fila 8 (1-indexed) — header ocupa filas 1-7
  const firstDataRow = 8;
  const lastDataRow = firstDataRow + members.length - 1; // última fila de empleado
  const totalRow = lastDataRow + 1;                       // fila TOTAL

  // Total Horas por empleado = Regular + OT1.5 + OT2 (columna E = B+C+D)
  for (let r = firstDataRow; r <= lastDataRow; r++) {
    wsResumen[`E${r}`] = { t: "n", f: `SUM(B${r}:D${r})`, z: "0.00" };
  }

  // Fila TOTAL: suma de cada columna
  wsResumen[`B${totalRow}`] = { t: "n", f: `SUM(B${firstDataRow}:B${lastDataRow})`, z: "0.00" };
  wsResumen[`C${totalRow}`] = { t: "n", f: `SUM(C${firstDataRow}:C${lastDataRow})`, z: "0.00" };
  wsResumen[`D${totalRow}`] = { t: "n", f: `SUM(D${firstDataRow}:D${lastDataRow})`, z: "0.00" };
  wsResumen[`E${totalRow}`] = { t: "n", f: `SUM(E${firstDataRow}:E${lastDataRow})`, z: "0.00" };

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
      +hours.toFixed(2), // fallback; se reemplaza por fórmula si hay entrada/salida
      proj ? (proj.number ? `${proj.number} - ${proj.name}` : proj.name) : "Sin proyecto",
    ]);
  }

  const wsDetalle = XLSX.utils.aoa_to_sheet([...detalleHeader, ...detalleRows]);

  // ── Fórmulas en Detalle ──
  // Los datos empiezan en la fila 6 (1-indexed) — header ocupa filas 1-5
  // Columnas: D=Entrada, E=Salida, F=Almuerzo(min), G=Horas Netas
  // Fórmula: (Salida − Entrada) en horas − Almuerzo/60, nunca negativo
  const detalleFirstRow = 6;
  detalleRows.forEach((row, i) => {
    const r = detalleFirstRow + i;
    const hasTimes = row[3] !== "—" && row[4] !== "—";
    if (hasTimes) {
      wsDetalle[`G${r}`] = {
        t: "n",
        f: `MAX(0,ROUND((TIMEVALUE(E${r})-TIMEVALUE(D${r}))*24-F${r}/60,2))`,
        z: "0.00",
      };
    }
    // Si no hay entrada/salida (registros viejos de PM con solo total),
    // se queda el valor estático que ya está en la celda.
  });

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