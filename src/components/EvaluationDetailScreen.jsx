import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  CLOSEOUT_ITEMS,
  SCORE_COLORS,
  SCORE_LABELS,
  bandFor,
  formatDate,
  groupBySection,
} from "../utils/evaluationHelpers";
import { exportEvaluationToExcel, printEvaluationPDF } from "../utils/exportEvaluation";

export default function EvaluationDetailScreen({ user, evaluationId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);
  const [project, setProject] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [punch, setPunch] = useState([]);
  const [names, setNames] = useState({ pm: "", coordinator: "", approver: "" });
  const [showAll, setShowAll] = useState(false);

  const [action, setAction] = useState(null); // null | approve | reject
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const isApprover = user.role === "approver";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);

    const { data: evalData } = await supabase
      .from("project_evaluations").select("*").eq("id", evaluationId).single();

    if (!evalData) { setLoading(false); return; }
    setEvaluation(evalData);

    const [projRes, critRes, scoreRes, punchRes, empRes] = await Promise.all([
      supabase.from("projects").select("id, number, name, client").eq("id", evalData.project_id).single(),
      supabase.from("evaluation_criteria").select("*").order("sort_order"),
      supabase.from("evaluation_scores").select("*").eq("evaluation_id", evaluationId),
      supabase.from("evaluation_punch_items").select("*").eq("evaluation_id", evaluationId).order("sort_order"),
      supabase.from("employees").select("id, full_name"),
    ]);

    setProject(projRes.data || null);
    setCriteria(critRes.data || []);
    setPunch(punchRes.data || []);

    const map = {};
    for (const row of scoreRes.data || []) {
      map[row.criterion_id] = { score: row.score, is_na: !!row.is_na, comment: row.comment || "" };
    }
    setScores(map);

    const people = empRes.data || [];
    const nameOf = (id) => people.find((p) => p.id === id)?.full_name || "";
    setNames({
      pm: nameOf(evalData.pm_id),
      coordinator: nameOf(evalData.coordinator_id),
      approver: nameOf(evalData.approved_by),
    });

    setLoading(false);
  }, [evaluationId]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove() {
    setSaving(true);
    setError("");
    const { error: upErr } = await supabase
      .from("project_evaluations")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejection_note: null,
      })
      .eq("id", evaluationId);
    setSaving(false);
    if (upErr) { setError("No se pudo aprobar: " + upErr.message); return; }
    showToast("Evaluación aprobada ✓");
    setTimeout(() => onBack(), 1400);
  }

  async function handleReject() {
    if (!rejectNote.trim()) { setError("Escribe qué hay que corregir."); return; }
    setSaving(true);
    setError("");
    const { error: upErr } = await supabase
      .from("project_evaluations")
      .update({
        status: "draft",
        rejection_note: rejectNote.trim(),
        signature: null,
        signed_at: null,
        submitted_at: null,
      })
      .eq("id", evaluationId);
    setSaving(false);
    if (upErr) { setError("No se pudo devolver: " + upErr.message); return; }
    showToast("Evaluación devuelta al PM");
    setTimeout(() => onBack(), 1400);
  }

  function exportCtx() {
    return {
      evaluation, criteria, scores, punch, project,
      pmName: names.pm, coordinatorName: names.coordinator, approverName: names.approver,
    };
  }

  if (loading) {
    return <div style={s.page}><p style={s.loading}>Cargando evaluación…</p></div>;
  }

  if (!evaluation) {
    return (
      <div style={s.page}>
        <button style={s.backBtn} onClick={onBack}>‹ Evaluaciones</button>
        <p style={s.loading}>No se encontró la evaluación.</p>
      </div>
    );
  }

  const band = evaluation.result ? bandFor(evaluation.result) : null;
  const sections = groupBySection(criteria);
  const lowScores = criteria
    .filter((c) => { const e = scores[c.id]; return e && !e.is_na && e.score != null && e.score < 3; })
    .map((c) => ({ criterion: c, entry: scores[c.id] }));
  const closeoutDone = CLOSEOUT_ITEMS.filter((i) => evaluation.closeout?.[i.key]).length;
  const canAct = isApprover && evaluation.status === "submitted";

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>‹ Evaluaciones</button>
      </div>

      <h2 style={s.title}>{project?.name || "Proyecto"}</h2>
      <p style={s.subtitle}>
        {[project?.number, project?.client].filter(Boolean).join(" · ")}
      </p>

      {evaluation.status === "approved" ? (
        <div style={{ ...s.banner, background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
          <b style={s.bannerTitle}>Aprobada el {formatDate(evaluation.approved_at)}</b>
          {names.approver ? `Por ${names.approver}. ` : ""}Firmada por {evaluation.signature || names.pm} el {formatDate(evaluation.signed_at)}.
        </div>
      ) : evaluation.status === "submitted" ? (
        <div style={{ ...s.banner, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
          <b style={s.bannerTitle}>Firmada el {formatDate(evaluation.signed_at)}</b>
          {evaluation.signature || names.pm} · PIN validado · pendiente de aprobación
        </div>
      ) : (
        <div style={{ ...s.banner, background: "#f3f4f6", borderColor: "#e5e7eb", color: "#4b5563" }}>
          <b style={s.bannerTitle}>Borrador</b>
          Todavía no ha sido firmada por el gerente de proyecto.
        </div>
      )}

      {/* Puntuación */}
      <div style={s.scoreBar}>
        <div>
          <div style={s.scoreNum}>{evaluation.score_obtained ?? 0}</div>
          <div style={s.scoreOf}>
            de {evaluation.score_possible ?? 0} posibles
            {(() => {
              const na = Object.values(scores).filter((v) => v.is_na).length;
              return na ? ` · ${na} N/A` : "";
            })()}
          </div>
        </div>
        <div style={s.scoreRight}>
          <div style={s.scorePct}>{evaluation.score_pct ?? 0}%</div>
          <div style={s.scoreRes}>{evaluation.result || "—"}</div>
        </div>
      </div>
      {band && (
        <div style={{ ...s.resultPill, background: band.bg, color: band.color }}>
          Resultado general: {band.label}
        </div>
      )}

      {/* Datos */}
      <div style={s.card}>
        <p style={s.cardHead}>Datos del proyecto</p>
        <Meta label="Fecha de inicio" value={formatDate(evaluation.start_date)} />
        <Meta label="Fecha de finalización" value={formatDate(evaluation.end_date)} />
        <Meta label="Gerente de Proyecto" value={names.pm || "—"} />
        <Meta label="Coordinador de Proyecto" value={names.coordinator || "—"} />
      </div>

      {/* Criterios bajo 3 */}
      {lowScores.length > 0 && (
        <div style={s.card}>
          <p style={s.cardHead}>Criterios bajo 3 · {lowScores.length}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {lowScores.map(({ criterion, entry }) => (
              <div key={criterion.id} style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                <span style={{ ...s.scoreChip, background: SCORE_COLORS[entry.score].bg, color: SCORE_COLORS[entry.score].color }}>
                  {entry.score}
                </span>
                <div>
                  <div style={s.critLabel}>{criterion.label}</div>
                  {entry.comment && <div style={s.critComment}>“{entry.comment}”</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todos los criterios */}
      <button style={s.toggleBtn} onClick={() => setShowAll((v) => !v)} type="button">
        {showAll ? "Ocultar los 20 criterios" : `Ver los ${criteria.length} criterios`}
      </button>

      {showAll && sections.map((section) => (
        <div key={section.name}>
          <div style={s.sectionHead}>{section.name}</div>
          <div style={s.card}>
            {section.items.map((criterion, i) => {
              const entry = scores[criterion.id];
              const key = entry?.is_na ? "na" : entry?.score;
              const colors = SCORE_COLORS[key] || SCORE_COLORS.na;
              return (
                <div key={criterion.id} style={{ ...s.critRow, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ ...s.scoreChip, background: colors.bg, color: colors.color }}>
                    {entry?.is_na ? "N/A" : (entry?.score ?? "—")}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={s.critLabel}>{criterion.label}</div>
                    {entry?.score != null && !entry.is_na && (
                      <div style={s.critScoreLabel}>{SCORE_LABELS[entry.score]}</div>
                    )}
                    {entry?.comment && <div style={s.critComment}>“{entry.comment}”</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Punch list */}
      <div style={s.card}>
        <p style={s.cardHead}>Trabajos pendientes · {punch.length}</p>
        {punch.length === 0
          ? <p style={s.emptyLine}>Sin trabajos pendientes.</p>
          : (
            <ul style={s.punchList}>
              {punch.map((p, i) => (
                <li key={p.id} style={s.punchItem}>
                  <span style={s.punchNum}>{i + 1}</span>
                  <span>{p.description}</span>
                </li>
              ))}
            </ul>
          )}
      </div>

      {evaluation.final_notes && (
        <div style={s.card}>
          <p style={s.cardHead}>Observaciones finales</p>
          <p style={s.noteText}>{evaluation.final_notes}</p>
        </div>
      )}

      {evaluation.corrective_actions && (
        <div style={s.card}>
          <p style={s.cardHead}>Acciones correctivas</p>
          <p style={s.noteText}>{evaluation.corrective_actions}</p>
        </div>
      )}

      <div style={s.card}>
        <p style={s.cardHead}>Cierre del proyecto · {closeoutDone} de {CLOSEOUT_ITEMS.length}</p>
        {CLOSEOUT_ITEMS.map((item) => (
          <div key={item.key} style={s.closeRow}>
            <span style={{ color: evaluation.closeout?.[item.key] ? "#16a34a" : "#d1d5db" }}>
              {evaluation.closeout?.[item.key] ? "✅" : "⬜"}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {error && <p style={s.error}>{error}</p>}

      {/* Acciones del aprobador */}
      {canAct && action === null && (
        <div style={s.actions}>
          <button style={s.btnOk} onClick={() => setAction("approve")} type="button">✅ Aprobar</button>
          <button style={s.btnNo} onClick={() => setAction("reject")} type="button">❌ Devolver</button>
        </div>
      )}

      {canAct && action === "approve" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>¿Aprobar y cerrar el proyecto?</p>
          <p style={s.confirmDesc}>La evaluación queda cerrada de forma permanente.</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.confirmYes} onClick={handleApprove} disabled={saving} type="button">
              {saving ? "Aprobando…" : "Sí, aprobar"}
            </button>
            <button style={s.confirmNo} onClick={() => setAction(null)} type="button">Cancelar</button>
          </div>
        </div>
      )}

      {canAct && action === "reject" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>Devolver al gerente de proyecto</p>
          <p style={s.confirmDesc}>Vuelve a borrador y se borra la firma. El PM verá tu nota.</p>
          <textarea
            style={s.textarea}
            placeholder="Qué hay que corregir…"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button style={s.confirmReject} onClick={handleReject} disabled={saving} type="button">
              {saving ? "Devolviendo…" : "Devolver"}
            </button>
            <button style={s.confirmNo} onClick={() => { setAction(null); setRejectNote(""); setError(""); }} type="button">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <button style={s.exportBtn} onClick={() => printEvaluationPDF(exportCtx())} type="button">
        📄 PDF con hoja de firmas
      </button>
      <button style={s.exportBtn} onClick={() => exportEvaluationToExcel(exportCtx())} type="button">
        📊 Exportar a Excel
      </button>

      <div style={{ height: "40px" }} />
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div style={s.metaRow}>
      <span style={s.metaLabel}>{label}</span>
      <span style={s.metaValue}>{value}</span>
    </div>
  );
}

const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loading: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "40px 0" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  topBar: { marginBottom: "8px" },
  backBtn: { background: "none", border: "none", fontSize: "15px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: "0 0 3px" },
  subtitle: { fontSize: "12.5px", color: "#6b7280", margin: "0 0 14px" },

  banner: { border: "1px solid", borderRadius: "12px", padding: "12px 14px", marginBottom: "14px", fontSize: "13px", lineHeight: 1.5 },
  bannerTitle: { display: "block", fontSize: "13px", marginBottom: "2px" },

  scoreBar: { background: "#2563eb", color: "#fff", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" },
  scoreNum: { fontSize: "26px", fontWeight: "700", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  scoreOf: { fontSize: "12px", opacity: 0.85, marginTop: "3px" },
  scoreRight: { marginLeft: "auto", textAlign: "right" },
  scorePct: { fontSize: "17px", fontWeight: "700", fontVariantNumeric: "tabular-nums" },
  scoreRes: { fontSize: "11px", opacity: 0.9, marginTop: "2px" },
  resultPill: { display: "inline-block", fontSize: "12.5px", fontWeight: "600", padding: "7px 13px", borderRadius: "999px", marginBottom: "14px" },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", marginBottom: "12px" },
  cardHead: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7280", margin: "0 0 11px" },

  metaRow: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", fontSize: "13.5px" },
  metaLabel: { color: "#6b7280" },
  metaValue: { color: "#111827", fontWeight: "500", textAlign: "right" },

  sectionHead: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#2563eb", margin: "16px 2px 8px" },
  critRow: { display: "flex", gap: "10px", alignItems: "flex-start", padding: "11px 0" },
  critLabel: { fontSize: "13.5px", lineHeight: 1.4, color: "#374151" },
  critScoreLabel: { fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" },
  critComment: { fontSize: "12px", color: "#6b7280", marginTop: "3px", fontStyle: "italic", lineHeight: 1.45 },
  scoreChip: { fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "7px", flexShrink: 0, minWidth: "30px", textAlign: "center" },

  toggleBtn: { width: "100%", padding: "11px", background: "#fff", border: "1px solid #e5e7eb", color: "#2563eb", borderRadius: "11px", fontSize: "13.5px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginBottom: "12px" },

  emptyLine: { fontSize: "12.5px", color: "#9ca3af", margin: 0 },
  punchList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "7px" },
  punchItem: { display: "flex", gap: "9px", alignItems: "flex-start", fontSize: "13.5px", color: "#374151", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "9px", padding: "9px 10px" },
  punchNum: { color: "#b45309", fontWeight: "700", fontSize: "12px", flexShrink: 0, lineHeight: 1.5 },
  noteText: { fontSize: "13.5px", color: "#374151", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" },
  closeRow: { display: "flex", gap: "9px", alignItems: "flex-start", fontSize: "13.5px", color: "#374151", padding: "5px 0", lineHeight: 1.45 },

  error: { color: "#dc2626", fontSize: "13px", textAlign: "center", margin: "0 0 10px" },
  actions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginBottom: "10px" },
  btnOk: { padding: "14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  btnNo: { padding: "14px", background: "#fff", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },

  confirmBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginBottom: "12px" },
  confirmTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 6px 0" },
  confirmDesc: { fontSize: "13px", color: "#6b7280", margin: "0 0 12px 0", lineHeight: 1.5 },
  confirmYes: { flex: 1, padding: "11px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmReject: { flex: 1, padding: "11px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { flex: 1, padding: "11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  textarea: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "14px", color: "#111827", padding: "9px 10px", border: "1px solid #e5e7eb", borderRadius: "9px", minHeight: "70px", resize: "vertical", lineHeight: 1.5 },

  exportBtn: { width: "100%", padding: "12px", background: "#fff", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "9px" },
};
