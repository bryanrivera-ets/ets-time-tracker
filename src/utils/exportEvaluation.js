import * as XLSX from "xlsx";
import {
  CLOSEOUT_ITEMS,
  SCORE_LABELS,
  formatDate,
  groupBySection,
  projectLabel,
} from "./evaluationHelpers";

function scoreText(entry) {
  if (!entry) return "Sin puntuar";
  if (entry.is_na) return "N/A";
  if (entry.score == null) return "Sin puntuar";
  return `${entry.score} — ${SCORE_LABELS[entry.score]}`;
}

function safeName(text) {
  return String(text || "Proyecto").replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, "").replace(/\s+/g, "_").slice(0, 40);
}

/**
 * Exporta la evaluación a Excel con dos hojas:
 *  - "Evaluación": encabezado, los 20 criterios con su puntuación y comentario, totales
 *  - "Cierre": punch list, checklist de cierre, observaciones y hoja de firmas
 */
export function exportEvaluationToExcel(ctx) {
  const { evaluation, criteria, scores, punch, project, pmName, coordinatorName, approverName } = ctx;

  const fileName = `ETS_Evaluacion_${safeName(project?.number || project?.name)}_${evaluation.end_date || evaluation.created_at?.slice(0, 10) || ""}.xlsx`;

  // ── Hoja 1: Evaluación ─────────────────────────────────────────────────────
  const head = [
    ["ETS Corporation — Evaluación de Cierre de Proyecto"],
    [],
    ["Proyecto", project?.name || "—"],
    ["Número", project?.number || "—"],
    ["Cliente", project?.client || "—"],
    ["Fecha de inicio", formatDate(evaluation.start_date)],
    ["Fecha de finalización", formatDate(evaluation.end_date)],
    ["Gerente de Proyecto", pmName || "—"],
    ["Coordinador de Proyecto", coordinatorName || "—"],
    ["Estado", evaluation.status === "approved" ? "Aprobada" : evaluation.status === "submitted" ? "Pendiente de aprobación" : "Borrador"],
    ["Firmada por", evaluation.signature || "—"],
    ["Fecha de firma", formatDate(evaluation.signed_at)],
    ["Aprobada por", approverName || "—"],
    ["Fecha de aprobación", formatDate(evaluation.approved_at)],
    [],
    ["Sección", "Criterio", "Puntuación", "Valor", "Comentario"],
  ];

  const rows = [];
  for (const section of groupBySection(criteria)) {
    for (const criterion of section.items) {
      const entry = scores[criterion.id];
      rows.push([
        section.name,
        criterion.label,
        scoreText(entry),
        entry && !entry.is_na && entry.score != null ? entry.score : "",
        entry?.comment || "",
      ]);
    }
  }

  rows.push([]);
  rows.push(["", "Puntuación obtenida", "", evaluation.score_obtained ?? 0, ""]);
  rows.push(["", "Puntuación posible", "", evaluation.score_possible ?? 0, ""]);
  rows.push(["", "Porcentaje", "", `${evaluation.score_pct ?? 0}%`, ""]);
  rows.push(["", "Resultado general", "", evaluation.result || "—", ""]);

  const ws1 = XLSX.utils.aoa_to_sheet([...head, ...rows]);
  ws1["!cols"] = [{ wch: 24 }, { wch: 52 }, { wch: 18 }, { wch: 8 }, { wch: 50 }];

  // ── Hoja 2: Cierre ─────────────────────────────────────────────────────────
  const closeRows = [
    ["ETS Corporation — Cierre del Proyecto"],
    [projectLabel(project)],
    [],
    ["TRABAJOS PENDIENTES · PUNCH LIST"],
  ];

  if (punch.length === 0) {
    closeRows.push(["Sin trabajos pendientes."]);
  } else {
    punch.forEach((p, i) => closeRows.push([`${i + 1}.`, p.description]));
  }

  closeRows.push([], ["OBSERVACIONES FINALES"], [evaluation.final_notes || "—"]);
  closeRows.push([], ["ACCIONES CORRECTIVAS Y RECOMENDACIONES"], [evaluation.corrective_actions || "—"]);
  closeRows.push([], ["CIERRE DEL PROYECTO"]);
  for (const item of CLOSEOUT_ITEMS) {
    closeRows.push([evaluation.closeout?.[item.key] ? "Sí" : "No", item.label]);
  }

  closeRows.push([], ["FIRMAS"], []);
  closeRows.push(["Gerente de Proyecto", pmName || "—", "Firmado en la app", formatDate(evaluation.signed_at)]);
  closeRows.push(["Coordinador de Proyecto", coordinatorName || "—", "_______________________", "__________"]);
  closeRows.push(["Supervisor", "", "_______________________", "__________"]);
  closeRows.push(["Aprobación del Cliente", "", "_______________________", "__________"]);

  const ws2 = XLSX.utils.aoa_to_sheet(closeRows);
  ws2["!cols"] = [{ wch: 26 }, { wch: 46 }, { wch: 26 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Evaluación");
  XLSX.utils.book_append_sheet(wb, ws2, "Cierre");
  XLSX.writeFile(wb, fileName);
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/**
 * Abre el diálogo de impresión con la evaluación formateada en carta,
 * incluyendo la hoja con las cuatro líneas de firma.
 * Usa un iframe oculto para que funcione también en Safari de iPhone.
 */
export function printEvaluationPDF(ctx) {
  const { evaluation, criteria, scores, punch, project, pmName, coordinatorName, approverName } = ctx;

  const sections = groupBySection(criteria);

  const criteriaHtml = sections.map((section) => `
    <tr class="sec"><td colspan="3">${esc(section.name)}</td></tr>
    ${section.items.map((criterion) => {
      const entry = scores[criterion.id];
      const value = entry?.is_na ? "N/A" : (entry?.score ?? "—");
      return `<tr>
        <td>${esc(criterion.label)}</td>
        <td class="num">${esc(value)}</td>
        <td class="cmt">${esc(entry?.comment || "")}</td>
      </tr>`;
    }).join("")}
  `).join("");

  const punchHtml = punch.length
    ? `<ol>${punch.map((p) => `<li>${esc(p.description)}</li>`).join("")}</ol>`
    : `<p class="muted">Sin trabajos pendientes.</p>`;

  const closeoutHtml = CLOSEOUT_ITEMS.map((item) => `
    <li><span class="box">${evaluation.closeout?.[item.key] ? "X" : ""}</span>${esc(item.label)}</li>
  `).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Evaluación de Cierre — ${esc(project?.number || project?.name || "")}</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; line-height: 1.45; }
  h1 { font-size: 15pt; margin: 0 0 2pt; }
  h2 { font-size: 11pt; margin: 16pt 0 6pt; border-bottom: 1pt solid #111; padding-bottom: 3pt; }
  .sub { font-size: 9pt; color: #555; margin: 0 0 14pt; }
  table { width: 100%; border-collapse: collapse; }
  .meta td { padding: 3pt 0; vertical-align: top; font-size: 9.5pt; }
  .meta td:first-child { width: 33%; color: #555; }
  .crit th, .crit td { border-bottom: 0.5pt solid #ccc; padding: 5pt 4pt; text-align: left; vertical-align: top; font-size: 9.5pt; }
  .crit th { border-bottom: 1pt solid #111; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; }
  .crit tr.sec td { background: #f0f0f0; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; padding: 4pt; border-bottom: none; }
  .crit .num { width: 44pt; text-align: center; font-weight: bold; }
  .crit .cmt { width: 36%; color: #555; font-size: 9pt; }
  .score { display: flex; gap: 24pt; align-items: baseline; margin-top: 10pt; }
  .score b { font-size: 18pt; }
  ol, ul { margin: 4pt 0 0; padding-left: 16pt; }
  ul.checks { list-style: none; padding: 0; }
  ul.checks li { margin-bottom: 4pt; }
  .box { display: inline-block; width: 11pt; height: 11pt; border: 0.75pt solid #111; margin-right: 6pt; text-align: center; line-height: 11pt; font-size: 8pt; font-weight: bold; vertical-align: -1pt; }
  .muted { color: #777; }
  .note { border: 0.5pt solid #ccc; padding: 7pt; min-height: 44pt; white-space: pre-wrap; }
  .sign { margin-top: 22pt; }
  .sign div { margin-bottom: 24pt; }
  .line { border-bottom: 0.75pt solid #111; height: 20pt; }
  .lbl { font-size: 8.5pt; color: #555; margin-top: 3pt; display: flex; justify-content: space-between; }
  .signed { font-size: 8.5pt; color: #555; }
  .pb { page-break-before: always; }
</style></head><body>
  <h1>Evaluación de Cierre de Proyecto</h1>
  <p class="sub">ETS Corporation</p>

  <table class="meta">
    <tr><td>Nombre del proyecto</td><td><b>${esc(project?.name || "—")}</b></td></tr>
    <tr><td>Cliente</td><td>${esc(project?.client || "—")}</td></tr>
    <tr><td>Número de proyecto</td><td>${esc(project?.number || "—")}</td></tr>
    <tr><td>Fecha de inicio</td><td>${esc(formatDate(evaluation.start_date))}</td></tr>
    <tr><td>Fecha de finalización</td><td>${esc(formatDate(evaluation.end_date))}</td></tr>
    <tr><td>Gerente de Proyecto</td><td>${esc(pmName || "—")}</td></tr>
    <tr><td>Coordinador de Proyecto</td><td>${esc(coordinatorName || "—")}</td></tr>
  </table>

  <h2>Criterios de evaluación</h2>
  <table class="crit">
    <thead><tr><th>Criterio</th><th class="num">Punt.</th><th class="cmt">Comentarios</th></tr></thead>
    <tbody>${criteriaHtml}</tbody>
  </table>

  <div class="score">
    <div><b>${esc(evaluation.score_obtained ?? 0)}</b> / ${esc(evaluation.score_possible ?? 0)}</div>
    <div><b>${esc(evaluation.score_pct ?? 0)}%</b></div>
    <div>Resultado general: <b>${esc(evaluation.result || "—")}</b></div>
  </div>

  <div class="pb"></div>

  <h2>Trabajos pendientes · Punch list</h2>
  ${punchHtml}

  <h2>Observaciones finales</h2>
  <div class="note">${esc(evaluation.final_notes || "")}</div>

  <h2>Acciones correctivas y recomendaciones</h2>
  <div class="note">${esc(evaluation.corrective_actions || "")}</div>

  <h2>Cierre del proyecto</h2>
  <ul class="checks">${closeoutHtml}</ul>

  <h2>Firmas</h2>
  <div class="sign">
    <div>
      <div class="line"></div>
      <div class="lbl"><span>Gerente de Proyecto — ${esc(pmName || "")}</span>
      <span class="signed">Firmado electrónicamente con PIN · ${esc(formatDate(evaluation.signed_at))}</span></div>
    </div>
    <div>
      <div class="line"></div>
      <div class="lbl"><span>Coordinador de Proyecto${coordinatorName ? " — " + esc(coordinatorName) : ""}</span><span>Fecha: ______________</span></div>
    </div>
    <div>
      <div class="line"></div>
      <div class="lbl"><span>Supervisor</span><span>Fecha: ______________</span></div>
    </div>
    <div>
      <div class="line"></div>
      <div class="lbl"><span>Aprobación del Cliente</span><span>Fecha: ______________</span></div>
    </div>
    ${approverName ? `<p class="signed">Aprobada en la app por ${esc(approverName)} · ${esc(formatDate(evaluation.approved_at))}</p>` : ""}
  </div>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  // El evento load del iframe puede haber disparado ya, así que lanzamos la
  // impresión una sola vez con un guard, sea por onload o por el timeout.
  let printed = false;
  const launch = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // Si el navegador bloquea la impresión, al menos limpiamos el iframe.
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 60000);
  };

  iframe.onload = launch;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(launch, 400);
}
