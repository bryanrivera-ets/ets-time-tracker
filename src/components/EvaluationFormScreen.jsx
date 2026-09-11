import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  CLOSEOUT_ITEMS,
  SCORE_COLORS,
  SCORE_LABELS,
  calcScore,
  groupBySection,
  projectLabel,
} from "../utils/evaluationHelpers";

const SCALE = [5, 4, 3, 2, 1, "na"];

export default function EvaluationFormScreen({ user, evaluationId, availableProjects, people, onBack }) {
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState([]);
  const [evaluation, setEvaluation] = useState(null);

  // Encabezado
  const [projectId, setProjectId] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Cuerpo
  const [scores, setScores] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [punch, setPunch] = useState([]);
  const [punchInput, setPunchInput] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [closeout, setCloseout] = useState({});

  // UI
  const [saving, setSaving] = useState(false);
  const [signingStep, setSigningStep] = useState(null); // null | confirm | pin
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const projectOptions = useMemo(() => {
    const list = [...(availableProjects || [])];
    // Al editar un borrador, su proyecto ya no está en "disponibles"
    if (evaluation?.project_id && !list.some((p) => p.id === evaluation.project_id)) {
      list.unshift({
        id: evaluation.project_id,
        number: evaluation._projectNumber,
        name: evaluation._projectName,
      });
    }
    return list;
  }, [availableProjects, evaluation]);

  const selectedProject = projectOptions.find((p) => p.id === projectId) || null;

  const coordinators = useMemo(
    () => (people || []).filter((p) => p.is_active !== false),
    [people]
  );

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);

    const { data: critData } = await supabase
      .from("evaluation_criteria")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    const activeCriteria = critData || [];
    setCriteria(activeCriteria);

    if (!evaluationId) {
      setScores({});
      setCloseout({});
      setLoading(false);
      return;
    }

    const { data: evalData } = await supabase
      .from("project_evaluations")
      .select("*")
      .eq("id", evaluationId)
      .single();

    if (!evalData) { setLoading(false); return; }

    let projectMeta = {};
    const { data: projData } = await supabase
      .from("projects")
      .select("id, number, name, client")
      .eq("id", evalData.project_id)
      .single();
    if (projData) {
      projectMeta = { _projectNumber: projData.number, _projectName: projData.name };
    }

    setEvaluation({ ...evalData, ...projectMeta });
    setProjectId(evalData.project_id || "");
    setCoordinatorId(evalData.coordinator_id || "");
    setStartDate(evalData.start_date || "");
    setEndDate(evalData.end_date || "");
    setFinalNotes(evalData.final_notes || "");
    setCorrectiveActions(evalData.corrective_actions || "");
    setCloseout(evalData.closeout || {});

    const [scoreRes, punchRes] = await Promise.all([
      supabase.from("evaluation_scores").select("*").eq("evaluation_id", evaluationId),
      supabase.from("evaluation_punch_items").select("*").eq("evaluation_id", evaluationId).order("sort_order"),
    ]);

    const scoreMap = {};
    const commentsOpen = {};
    for (const row of scoreRes.data || []) {
      scoreMap[row.criterion_id] = {
        score: row.score,
        is_na: !!row.is_na,
        comment: row.comment || "",
      };
      if (row.comment) commentsOpen[row.criterion_id] = true;
    }
    setScores(scoreMap);
    setOpenComments(commentsOpen);
    setPunch((punchRes.data || []).map((p) => ({ id: p.id, description: p.description })));

    setLoading(false);
  }, [evaluationId]);

  useEffect(() => { load(); }, [load]);

  const summary = calcScore(scores, criteria.length);
  const sections = useMemo(() => groupBySection(criteria), [criteria]);
  const isLocked = evaluation && evaluation.status !== "draft";

  function setScore(criterionId, value) {
    setScores((prev) => {
      const current = prev[criterionId] || { score: null, is_na: false, comment: "" };
      const alreadySelected = value === "na" ? current.is_na : current.score === value;
      return {
        ...prev,
        [criterionId]: {
          ...current,
          score: alreadySelected || value === "na" ? null : value,
          is_na: alreadySelected ? false : value === "na",
        },
      };
    });
  }

  function setComment(criterionId, text) {
    setScores((prev) => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] || { score: null, is_na: false }), comment: text },
    }));
  }

  function addPunch() {
    const text = punchInput.trim();
    if (!text) return;
    setPunch((p) => [...p, { id: `tmp-${Date.now()}`, description: text }]);
    setPunchInput("");
  }

  function removePunch(id) {
    setPunch((p) => p.filter((x) => x.id !== id));
  }

  function missingFields() {
    const missing = [];
    if (!projectId) missing.push("el proyecto");
    if (!endDate) missing.push("la fecha de finalización");
    if (summary.unscored > 0) {
      missing.push(`${summary.unscored} criterio${summary.unscored !== 1 ? "s" : ""} sin puntuar`);
    }
    return missing;
  }

  async function persist(extra = {}) {
    const payload = {
      project_id: projectId,
      pm_id: user.id,
      coordinator_id: coordinatorId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      score_obtained: summary.obtained,
      score_possible: summary.possible,
      score_pct: summary.pct,
      result: summary.result,
      final_notes: finalNotes || null,
      corrective_actions: correctiveActions || null,
      closeout,
      ...extra,
    };

    let id = evaluation?.id || null;

    if (id) {
      const { error: upErr } = await supabase
        .from("project_evaluations")
        .update(payload)
        .eq("id", id);
      if (upErr) throw upErr;
    } else {
      const { data, error: insErr } = await supabase
        .from("project_evaluations")
        .insert({ ...payload, status: "draft" })
        .select()
        .single();
      if (insErr) throw insErr;
      id = data.id;
      setEvaluation(data);
    }

    // Puntuaciones: se reemplazan completas (son 20 filas, sale más barato así)
    await supabase.from("evaluation_scores").delete().eq("evaluation_id", id);
    const scoreRows = Object.entries(scores)
      .filter(([, v]) => v && (v.score != null || v.is_na || (v.comment || "").trim()))
      .map(([criterionId, v]) => ({
        evaluation_id: id,
        criterion_id: criterionId,
        score: v.is_na ? null : v.score,
        is_na: !!v.is_na,
        comment: (v.comment || "").trim() || null,
      }));
    if (scoreRows.length) {
      const { error: scoreErr } = await supabase.from("evaluation_scores").insert(scoreRows);
      if (scoreErr) throw scoreErr;
    }

    // Punch list
    await supabase.from("evaluation_punch_items").delete().eq("evaluation_id", id);
    if (punch.length) {
      const { error: punchErr } = await supabase.from("evaluation_punch_items").insert(
        punch.map((p, i) => ({ evaluation_id: id, sort_order: i, description: p.description }))
      );
      if (punchErr) throw punchErr;
    }

    return id;
  }

  async function handleSaveDraft() {
    if (!projectId) { setError("Escoge el proyecto antes de guardar."); return; }
    setSaving(true);
    setError("");
    try {
      await persist({ rejection_note: null });
      showToast("Borrador guardado ✓");
    } catch (e) {
      setError("No se pudo guardar: " + (e.message || "error desconocido"));
    }
    setSaving(false);
  }

  function handlePinKey(key) {
    if (key === "C") { setPin(""); return; }
    if (key === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    setPin((p) => p + key);
  }

  async function handleSign() {
    setSaving(true);
    setError("");

    const { data: validData, error: rpcError } = await supabase.rpc("validate_pin", {
      employee_id: user.id,
      pin_attempt: pin,
    });

    const isValid = !rpcError && validData !== null &&
      JSON.stringify(validData).toLowerCase().includes("acceso correcto");

    if (!isValid) {
      setPin("");
      setSaving(false);
      setError("PIN incorrecto. Intenta de nuevo.");
      return;
    }

    try {
      const now = new Date().toISOString();
      await persist({
        status: "submitted",
        signature: user.full_name,
        signed_at: now,
        submitted_at: now,
        rejection_note: null,
      });
      setSaving(false);
      showToast("Evaluación firmada y enviada ✓");
      setTimeout(() => onBack(), 1500);
    } catch (e) {
      setSaving(false);
      setPin("");
      setError("No se pudo firmar: " + (e.message || "error desconocido"));
    }
  }

  // Firma automática al completar los 4 dígitos.
  // El ref evita que un re-render dispare una segunda firma con el mismo PIN.
  const signingRef = useRef(false);
  useEffect(() => {
    if (pin.length !== 4 || signingRef.current) return;
    signingRef.current = true;
    Promise.resolve(handleSign()).finally(() => { signingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  if (loading) {
    return <div style={s.page}><p style={s.loading}>Cargando…</p></div>;
  }

  const missing = missingFields();

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>‹ Evaluaciones</button>
        <h2 style={s.title}>Evaluación de cierre</h2>
      </div>

      {evaluation?.rejection_note && (
        <div style={s.rejectBanner}>
          <b style={s.bannerTitle}>Devuelta para corrección</b>
          {evaluation.rejection_note}
        </div>
      )}

      {/* Puntuación en vivo */}
      <div style={s.scoreBar}>
        <div>
          <div style={s.scoreNum}>{summary.possible > 0 ? summary.obtained : "—"}</div>
          <div style={s.scoreOf}>
            {summary.possible > 0
              ? [`de ${summary.possible} posibles`,
                 summary.naCount ? `${summary.naCount} N/A` : null,
                 summary.unscored ? `${summary.unscored} sin puntuar` : null]
                .filter(Boolean).join(" · ")
              : "sin puntuar"}
          </div>
        </div>
        <div style={s.scoreRight}>
          <div style={s.scorePct}>{summary.possible > 0 ? `${summary.pct}%` : "—"}</div>
          <div style={s.scoreRes}>{summary.result || "Puntúa los criterios"}</div>
        </div>
      </div>
      <div style={s.track}>
        <div style={{ ...s.trackFill, width: `${summary.possible > 0 ? summary.pct : 0}%` }} />
      </div>

      {/* Datos del proyecto */}
      <div style={s.card}>
        <p style={s.cardHead}>Datos del proyecto</p>

        <div style={s.field}>
          <label style={s.label} htmlFor="ev-project">Proyecto</label>
          <select
            id="ev-project"
            style={s.input}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isLocked || !!evaluation}
          >
            <option value="">— Escoge un proyecto —</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>{projectLabel(p)}</option>
            ))}
          </select>
          {!evaluation && projectOptions.length === 0 && (
            <p style={s.helpText}>Todos los proyectos activos ya tienen evaluación.</p>
          )}
        </div>

        {selectedProject?.client && (
          <div style={s.field}>
            <label style={s.label}>Cliente</label>
            <input style={{ ...s.input, ...s.readonly }} value={selectedProject.client} readOnly />
          </div>
        )}

        <div style={s.two}>
          <div style={s.field}>
            <label style={s.label} htmlFor="ev-start">Fecha de inicio</label>
            <input id="ev-start" type="date" style={s.input} value={startDate}
              onChange={(e) => setStartDate(e.target.value)} disabled={isLocked} />
          </div>
          <div style={s.field}>
            <label style={s.label} htmlFor="ev-end">Fecha de finalización</label>
            <input id="ev-end" type="date" style={s.input} value={endDate}
              onChange={(e) => setEndDate(e.target.value)} disabled={isLocked} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Gerente de Proyecto</label>
          <input style={{ ...s.input, ...s.readonly }} value={user.full_name} readOnly />
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="ev-coord">Coordinador de Proyecto</label>
          <select id="ev-coord" style={s.input} value={coordinatorId}
            onChange={(e) => setCoordinatorId(e.target.value)} disabled={isLocked}>
            <option value="">— Ninguno —</option>
            {coordinators.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Criterios */}
      {sections.map((section) => (
        <div key={section.name}>
          <div style={s.sectionHead}>
            <span>{section.name}</span>
            <span style={s.sectionCount}>{section.items.length}</span>
          </div>
          <div style={s.card}>
            {section.items.map((criterion, i) => {
              const value = scores[criterion.id] || { score: null, is_na: false, comment: "" };
              const commentOpen = openComments[criterion.id] || !!value.comment;
              return (
                <div key={criterion.id} style={{ ...s.crit, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
                  <div style={s.critTop}>
                    <div style={s.critLabel}>{criterion.label}</div>
                    <button
                      style={{ ...s.commentBtn, color: value.comment ? "#2563eb" : "#9ca3af" }}
                      onClick={() => setOpenComments((o) => ({ ...o, [criterion.id]: !commentOpen }))}
                      aria-label={`Comentario para ${criterion.label}`}
                      type="button"
                    >
                      💬
                    </button>
                  </div>
                  <div style={s.scale}>
                    {SCALE.map((v) => {
                      const active = v === "na" ? value.is_na : value.score === v;
                      const colors = SCORE_COLORS[v];
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setScore(criterion.id, v)}
                          disabled={isLocked}
                          title={v === "na" ? "No aplica" : SCORE_LABELS[v]}
                          style={{
                            ...s.scaleBtn,
                            fontSize: v === "na" ? "11px" : "13px",
                            background: active ? colors.bg : "#fff",
                            color: active ? colors.color : "#6b7280",
                            borderColor: active ? "transparent" : "#e5e7eb",
                          }}
                        >
                          {v === "na" ? "N/A" : v}
                        </button>
                      );
                    })}
                  </div>
                  {commentOpen && (
                    <textarea
                      style={s.critComment}
                      placeholder="Comentario (opcional)"
                      value={value.comment || ""}
                      onChange={(e) => setComment(criterion.id, e.target.value)}
                      disabled={isLocked}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={s.legend}>
        {[5, 4, 3, 2, 1].map((n) => (
          <span key={n} style={s.legendItem}>
            <i style={{ ...s.legendDot, background: SCORE_COLORS[n].bg }} />
            {n} {SCORE_LABELS[n]}
          </span>
        ))}
        <span style={s.legendItem}>
          <i style={{ ...s.legendDot, background: SCORE_COLORS.na.bg }} />
          N/A no cuenta
        </span>
      </div>

      {/* Punch list */}
      <div style={s.card}>
        <p style={s.cardHead}>Trabajos pendientes · Punch list</p>
        {punch.length === 0 && <p style={s.emptyLine}>Sin trabajos pendientes.</p>}
        <ul style={s.punchList}>
          {punch.map((item, i) => (
            <li key={item.id} style={s.punchItem}>
              <span style={s.punchNum}>{i + 1}</span>
              <span style={{ flex: 1 }}>{item.description}</span>
              {!isLocked && (
                <button style={s.punchX} onClick={() => removePunch(item.id)} type="button"
                  aria-label={`Quitar ${item.description}`}>✕</button>
              )}
            </li>
          ))}
        </ul>
        {!isLocked && (
          <div style={s.punchAdd}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Añadir pendiente…"
              value={punchInput}
              onChange={(e) => setPunchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPunch(); } }}
            />
            <button style={s.punchBtn} onClick={addPunch} type="button">Añadir</button>
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div style={s.card}>
        <p style={s.cardHead}>Observaciones finales</p>
        <textarea
          style={s.textarea}
          placeholder="Resumen del desempeño general del proyecto…"
          value={finalNotes}
          onChange={(e) => setFinalNotes(e.target.value)}
          disabled={isLocked}
        />
      </div>

      <div style={s.card}>
        <p style={s.cardHead}>Acciones correctivas y recomendaciones</p>
        <textarea
          style={s.textarea}
          placeholder="Qué hacer distinto en el próximo proyecto…"
          value={correctiveActions}
          onChange={(e) => setCorrectiveActions(e.target.value)}
          disabled={isLocked}
        />
      </div>

      {/* Cierre */}
      <div style={s.card}>
        <p style={s.cardHead}>Cierre del proyecto</p>
        {CLOSEOUT_ITEMS.map((item, i) => (
          <label
            key={item.key}
            style={{ ...s.check, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}
            htmlFor={`co-${item.key}`}
          >
            <input
              id={`co-${item.key}`}
              type="checkbox"
              checked={!!closeout[item.key]}
              onChange={(e) => setCloseout((c) => ({ ...c, [item.key]: e.target.checked }))}
              disabled={isLocked}
              style={s.checkInput}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {error && <p style={s.error}>{error}</p>}

      {!isLocked && signingStep === null && (
        <>
          <button
            style={{ ...s.signBtn, opacity: missing.length > 0 ? 0.55 : 1 }}
            onClick={() => missing.length === 0 && setSigningStep("confirm")}
            disabled={missing.length > 0 || saving}
            type="button"
          >
            ✍️ Revisar y firmar
          </button>
          {missing.length > 0 && (
            <p style={s.missing}>Falta {missing.join(", ")}.</p>
          )}
          <button style={s.draftBtn} onClick={handleSaveDraft} disabled={saving} type="button">
            {saving ? "Guardando…" : "Guardar como borrador"}
          </button>
        </>
      )}

      {signingStep === "confirm" && (
        <div style={s.confirmBox}>
          <p style={s.confirmTitle}>¿Confirmas que la evaluación está completa?</p>
          <p style={s.confirmDesc}>
            Una vez firmada queda bloqueada y va al panel de aprobación. Solo un aprobador puede devolverla.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.confirmYes} onClick={() => setSigningStep("pin")} type="button">Sí, firmar</button>
            <button style={s.confirmNo} onClick={() => setSigningStep(null)} type="button">Cancelar</button>
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
                type="button"
                style={{ ...s.pinKey, color: k === "C" ? "#dc2626" : "#111827" }}
                onClick={() => handlePinKey(k)}
                disabled={saving}
              >
                {k}
              </button>
            ))}
          </div>
          <p style={s.pinNote}>
            El coordinador, el supervisor y el cliente firman el PDF exportado.
          </p>
          <button
            style={s.cancelPin}
            onClick={() => { setSigningStep(null); setPin(""); setError(""); }}
            type="button"
          >
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
  loading: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "40px 0" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  backBtn: { background: "none", border: "none", fontSize: "15px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 },
  rejectBanner: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "12px", padding: "12px 14px", marginBottom: "12px", fontSize: "13px", lineHeight: 1.5 },
  bannerTitle: { display: "block", fontSize: "13px", marginBottom: "2px" },

  scoreBar: { background: "#2563eb", color: "#fff", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 14px -6px rgba(37,99,235,0.6)" },
  scoreNum: { fontSize: "24px", fontWeight: "700", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  scoreOf: { fontSize: "12px", opacity: 0.85, marginTop: "3px" },
  scoreRight: { marginLeft: "auto", textAlign: "right" },
  scorePct: { fontSize: "16px", fontWeight: "700", fontVariantNumeric: "tabular-nums" },
  scoreRes: { fontSize: "11px", opacity: 0.9, marginTop: "2px" },
  track: { height: "4px", background: "#e5e7eb", borderRadius: "2px", margin: "8px 2px 14px", overflow: "hidden" },
  trackFill: { height: "100%", background: "#2563eb", borderRadius: "2px", transition: "width 0.25s" },

  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", marginBottom: "12px" },
  cardHead: { fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7280", margin: "0 0 11px" },

  field: { marginBottom: "11px" },
  label: { display: "block", fontSize: "11px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" },
  input: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "14px", color: "#111827", padding: "9px 10px", border: "1px solid #e5e7eb", borderRadius: "9px", background: "#fff" },
  readonly: { background: "#f9fafb", color: "#6b7280" },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  helpText: { fontSize: "11.5px", color: "#9ca3af", margin: "5px 0 0" },
  textarea: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "14px", color: "#111827", padding: "9px 10px", border: "1px solid #e5e7eb", borderRadius: "9px", minHeight: "80px", resize: "vertical", lineHeight: 1.5, background: "#fff" },

  sectionHead: { display: "flex", alignItems: "baseline", fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#2563eb", margin: "18px 2px 8px" },
  sectionCount: { marginLeft: "auto", fontSize: "11px", color: "#9ca3af", letterSpacing: 0, fontVariantNumeric: "tabular-nums" },

  crit: { padding: "12px 0" },
  critTop: { display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" },
  critLabel: { fontSize: "13.5px", lineHeight: 1.4, color: "#374151", flex: 1 },
  commentBtn: { background: "none", border: "none", fontSize: "13px", cursor: "pointer", padding: "2px 4px", flexShrink: 0, lineHeight: 1, fontFamily: "inherit" },
  scale: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px" },
  scaleBtn: { fontFamily: "inherit", fontWeight: "700", fontVariantNumeric: "tabular-nums", padding: "9px 0", borderRadius: "8px", cursor: "pointer", border: "1px solid #e5e7eb", minHeight: "38px", transition: "all 0.12s" },
  critComment: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "13px", marginTop: "8px", padding: "8px 9px", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", minHeight: "54px", color: "#111827", background: "#fff" },

  legend: { display: "flex", flexWrap: "wrap", gap: "5px 10px", fontSize: "10.5px", color: "#6b7280", margin: "0 2px 16px" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: "4px" },
  legendDot: { width: "9px", height: "9px", borderRadius: "3px", display: "inline-block" },

  emptyLine: { fontSize: "12.5px", color: "#9ca3af", margin: "0 0 10px" },
  punchList: { listStyle: "none", margin: "0 0 10px", padding: 0, display: "flex", flexDirection: "column", gap: "7px" },
  punchItem: { display: "flex", gap: "9px", alignItems: "flex-start", fontSize: "13.5px", color: "#374151", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "9px", padding: "9px 10px" },
  punchNum: { color: "#b45309", fontWeight: "700", fontSize: "12px", flexShrink: 0, lineHeight: 1.5 },
  punchX: { marginLeft: "auto", background: "none", border: "none", color: "#b45309", cursor: "pointer", fontSize: "15px", padding: "0 2px", lineHeight: 1, flexShrink: 0, fontFamily: "inherit" },
  punchAdd: { display: "flex", gap: "7px" },
  punchBtn: { fontFamily: "inherit", fontSize: "13.5px", fontWeight: "600", padding: "9px 14px", borderRadius: "9px", border: "none", background: "#eff6ff", color: "#2563eb", cursor: "pointer", flexShrink: 0 },

  check: { display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", cursor: "pointer", fontSize: "13.5px", color: "#374151" },
  checkInput: { width: "19px", height: "19px", flexShrink: 0, margin: "1px 0 0", accentColor: "#2563eb", cursor: "pointer" },

  error: { color: "#dc2626", fontSize: "13px", textAlign: "center", margin: "0 0 10px" },
  missing: { fontSize: "12px", color: "#9ca3af", textAlign: "center", margin: "8px 0 0", lineHeight: 1.45 },
  signBtn: { width: "100%", padding: "15px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "13px", fontSize: "16px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  draftBtn: { width: "100%", padding: "12px", background: "#fff", border: "1px solid #e5e7eb", color: "#6b7280", borderRadius: "13px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "9px" },

  confirmBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginBottom: "12px" },
  confirmTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 6px 0" },
  confirmDesc: { fontSize: "13px", color: "#6b7280", margin: "0 0 14px 0", lineHeight: 1.5 },
  confirmYes: { flex: 1, padding: "11px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { flex: 1, padding: "11px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },

  pinBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px 16px", marginBottom: "12px" },
  pinTitle: { fontSize: "15px", fontWeight: "600", color: "#111827", textAlign: "center", margin: "0 0 16px 0" },
  pinDots: { display: "flex", justifyContent: "center", gap: "12px", marginBottom: "12px" },
  pinDot: { width: "14px", height: "14px", borderRadius: "50%", transition: "background 0.15s" },
  pinError: { color: "#dc2626", fontSize: "13px", textAlign: "center", margin: "0 0 10px 0" },
  pinGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxWidth: "280px", margin: "0 auto 14px" },
  pinKey: { padding: "14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", fontSize: "20px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  pinNote: { fontSize: "11.5px", color: "#9ca3af", textAlign: "center", margin: "0 0 8px", lineHeight: 1.45 },
  cancelPin: { width: "100%", padding: "10px", background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
};
