// Lógica compartida de la Evaluación de Cierre de Proyecto.
// La usan el formulario del PM, la vista del aprobador y las exportaciones.

export const CLOSEOUT_ITEMS = [
  { key: "completado",    label: "Proyecto completado en su totalidad" },
  { key: "inspeccion",    label: "Cliente realizó inspección final" },
  { key: "pendientes",    label: "Trabajos pendientes fueron corregidos" },
  { key: "changeOrders",  label: "Change Orders fueron documentados" },
  { key: "retiro",        label: "Materiales y equipos fueron retirados" },
  { key: "documentacion", label: "Documentación final fue entregada / archivada" },
  { key: "autorizado",    label: "Proyecto autorizado para cierre administrativo" },
];

// De mayor a menor — el primero que cumple gana.
export const RESULT_BANDS = [
  { min: 90, label: "Excelente",            color: "#15803d", bg: "#dcfce7" },
  { min: 80, label: "Bueno",                color: "#4d7c0f", bg: "#ecfccb" },
  { min: 70, label: "Satisfactorio",        color: "#a16207", bg: "#fef9c3" },
  { min: 60, label: "Requiere seguimiento", color: "#c2410c", bg: "#ffedd5" },
  { min: 0,  label: "No satisfactorio",     color: "#b91c1c", bg: "#fee2e2" },
];

export const SCORE_COLORS = {
  5:  { color: "#15803d", bg: "#dcfce7" },
  4:  { color: "#4d7c0f", bg: "#ecfccb" },
  3:  { color: "#a16207", bg: "#fef9c3" },
  2:  { color: "#c2410c", bg: "#ffedd5" },
  1:  { color: "#b91c1c", bg: "#fee2e2" },
  na: { color: "#6b7280", bg: "#f3f4f6" },
};

export const SCORE_LABELS = {
  5: "Excelente",
  4: "Bueno",
  3: "Aceptable",
  2: "Requiere mejora",
  1: "Deficiente",
};

/**
 * Calcula la puntuación de una evaluación.
 * Los criterios marcados N/A salen del total Y del denominador,
 * así un proyecto sin change orders no se ve peor de lo que fue.
 *
 * @param {object} scores - mapa { criterionId: { score, is_na, comment } }
 * @param {number} totalCriteria - cuántos criterios activos hay
 */
export function calcScore(scores, totalCriteria) {
  let obtained = 0;
  let possible = 0;
  let naCount = 0;
  let scored = 0;

  for (const entry of Object.values(scores || {})) {
    if (!entry) continue;
    if (entry.is_na) { naCount++; continue; }
    if (entry.score == null) continue;
    obtained += entry.score;
    possible += 5;
    scored++;
  }

  const unscored = Math.max(0, (totalCriteria || 0) - naCount - scored);
  const pct = possible > 0 ? Math.round((obtained / possible) * 100) : 0;
  const band = possible > 0
    ? RESULT_BANDS.find((b) => pct >= b.min)
    : null;

  return {
    obtained,
    possible,
    pct,
    naCount,
    scored,
    unscored,
    result: band ? band.label : null,
    band,
    isComplete: unscored === 0 && (scored + naCount) === (totalCriteria || 0),
  };
}

export function bandFor(result) {
  return RESULT_BANDS.find((b) => b.label === result) || RESULT_BANDS[RESULT_BANDS.length - 1];
}

/** Agrupa criterios por sección respetando el sort_order. */
export function groupBySection(criteria) {
  const order = [];
  const map = new Map();
  const sorted = [...(criteria || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const c of sorted) {
    if (!map.has(c.section)) { map.set(c.section, []); order.push(c.section); }
    map.get(c.section).push(c);
  }
  return order.map((name) => ({ name, items: map.get(name) }));
}

export function formatDate(value) {
  if (!value) return "—";
  const d = value.length <= 10
    ? new Date(value + "T12:00:00")
    : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PR", { day: "numeric", month: "short", year: "numeric" });
}

export function statusLabel(status) {
  if (status === "approved") return "Aprobada";
  if (status === "submitted") return "Pendiente";
  return "Borrador";
}

export function statusColors(status) {
  if (status === "approved") return { bg: "#dcfce7", color: "#15803d" };
  if (status === "submitted") return { bg: "#fef9c3", color: "#a16207" };
  return { bg: "#f3f4f6", color: "#6b7280" };
}

export function projectLabel(project) {
  if (!project) return "Proyecto";
  return project.number ? `${project.number} — ${project.name}` : project.name;
}
