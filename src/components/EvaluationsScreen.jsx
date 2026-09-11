import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import EvaluationFormScreen from "./EvaluationFormScreen";
import EvaluationDetailScreen from "./EvaluationDetailScreen";
import {
  formatDate,
  statusLabel,
  statusColors,
  bandFor,
} from "../utils/evaluationHelpers";

export default function EvaluationsScreen({ user }) {
  const [view, setView] = useState("list"); // list | form | detail
  const [activeId, setActiveId] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const isApprover = user.role === "approver";

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [evalRes, projRes, empRes] = await Promise.all([
      supabase.from("project_evaluations").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("id, number, name, client, is_active").order("number"),
      supabase.from("employees").select("id, full_name, role, is_active").order("full_name"),
    ]);

    const allEvals = evalRes.data || [];
    setProjects(projRes.data || []);
    setPeople(empRes.data || []);
    setAllEvaluations(allEvals);
    setEvaluations(isApprover ? allEvals : allEvals.filter((e) => e.pm_id === user.id));
    setLoading(false);
  }, [isApprover, user.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function projectOf(evaluation) {
    return projects.find((p) => p.id === evaluation.project_id) || null;
  }

  function nameOf(id) {
    return people.find((p) => p.id === id)?.full_name || "—";
  }

  // Proyectos activos que todavía no tienen evaluación.
  // Se mira contra TODAS las evaluaciones, no solo las mías: un proyecto que
  // ya evaluó otro PM no puede volver a evaluarse (índice único por proyecto).
  const evaluatedIds = new Set(allEvaluations.map((e) => e.project_id));
  const availableProjects = projects.filter((p) => p.is_active && !evaluatedIds.has(p.id));

  function openForm(id) { setActiveId(id); setView("form"); }
  function openDetail(id) { setActiveId(id); setView("detail"); }
  function backToList() { setActiveId(null); setView("list"); fetchAll(); }

  if (view === "form") {
    return (
      <EvaluationFormScreen
        user={user}
        evaluationId={activeId}
        availableProjects={availableProjects}
        people={people}
        onBack={backToList}
      />
    );
  }

  if (view === "detail") {
    return (
      <EvaluationDetailScreen
        user={user}
        evaluationId={activeId}
        onBack={backToList}
      />
    );
  }

  if (loading) {
    return <div style={s.page}><p style={s.loading}>Cargando evaluaciones…</p></div>;
  }

  const drafts = evaluations.filter((e) => e.status === "draft");
  const submitted = evaluations.filter((e) => e.status === "submitted");
  const approved = evaluations.filter((e) => e.status === "approved");

  function Row({ evaluation }) {
    const project = projectOf(evaluation);
    const colors = statusColors(evaluation.status);
    const showScore = evaluation.status !== "draft" && evaluation.score_possible > 0;
    const band = evaluation.result ? bandFor(evaluation.result) : null;

    const meta = [];
    if (project?.number) meta.push(project.number);
    if (project?.client) meta.push(project.client);
    if (isApprover) meta.push(nameOf(evaluation.pm_id));
    if (evaluation.status === "submitted" && evaluation.submitted_at) {
      meta.push("enviada " + formatDate(evaluation.submitted_at));
    }
    if (evaluation.status === "approved" && evaluation.approved_at) {
      meta.push("aprobada " + formatDate(evaluation.approved_at));
    }
    if (showScore) {
      meta.push(`${evaluation.score_obtained}/${evaluation.score_possible} · ${evaluation.score_pct}%`);
    }

    const canEdit = !isApprover && evaluation.status === "draft";
    const onClick = canEdit
      ? () => openForm(evaluation.id)
      : () => openDetail(evaluation.id);

    return (
      <button style={s.row} onClick={onClick}>
        <div style={s.rowIcon}>
          {evaluation.status === "approved" ? "✅" : evaluation.status === "submitted" ? "📤" : "📝"}
        </div>
        <div style={s.rowBody}>
          <div style={s.rowName}>{project?.name || "Proyecto eliminado"}</div>
          <div style={s.rowMeta}>{meta.join(" · ")}</div>
          {evaluation.rejection_note && evaluation.status === "draft" && (
            <div style={s.rejectNote}>↩ Devuelta: {evaluation.rejection_note}</div>
          )}
        </div>
        <span style={{ ...s.badge, background: band && evaluation.status === "approved" ? band.bg : colors.bg, color: band && evaluation.status === "approved" ? band.color : colors.color }}>
          {evaluation.status === "approved" && band ? band.label : statusLabel(evaluation.status)}
        </span>
      </button>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>{isApprover ? "Evaluaciones de cierre" : "Mis evaluaciones"}</h2>
        {!isApprover && (
          <button
            style={{ ...s.newBtn, opacity: availableProjects.length === 0 ? 0.5 : 1 }}
            onClick={() => openForm(null)}
            disabled={availableProjects.length === 0}
          >
            + Nueva
          </button>
        )}
      </div>

      {isApprover ? (
        <>
          <Section title={`Pendientes de aprobar${submitted.length ? ` · ${submitted.length}` : ""}`} />
          {submitted.length === 0
            ? <Empty text="No hay evaluaciones esperando aprobación." />
            : submitted.map((e) => <Row key={e.id} evaluation={e} />)}

          <Section title="Aprobadas" />
          {approved.length === 0
            ? <Empty text="Todavía no se ha cerrado ningún proyecto." />
            : approved.map((e) => <Row key={e.id} evaluation={e} />)}
        </>
      ) : (
        <>
          {drafts.length > 0 && <Section title="Borradores" />}
          {drafts.map((e) => <Row key={e.id} evaluation={e} />)}

          {submitted.length > 0 && <Section title="Enviadas" />}
          {submitted.map((e) => <Row key={e.id} evaluation={e} />)}

          {approved.length > 0 && <Section title="Cerradas" />}
          {approved.map((e) => <Row key={e.id} evaluation={e} />)}

          {evaluations.length === 0 && (
            <div style={s.emptyState}>
              <p style={s.emptyIcon}>📋</p>
              <p style={s.emptyTitle}>Sin evaluaciones todavía</p>
              <p style={s.emptyDesc}>
                {availableProjects.length > 0
                  ? "Cuando termines un proyecto, pulsa “+ Nueva” para evaluar su cierre."
                  : "Todos los proyectos activos ya tienen evaluación."}
              </p>
            </div>
          )}
        </>
      )}

      <div style={{ height: "40px" }} />
    </div>
  );
}

function Section({ title }) {
  return <div style={s.sectionTitle}>{title}</div>;
}

function Empty({ text }) {
  return <p style={s.emptyText}>{text}</p>;
}

const s = {
  page: { padding: "16px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  loading: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "40px 0" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" },
  title: { fontSize: "17px", fontWeight: "600", color: "#111827", margin: 0 },
  newBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  sectionTitle: { fontSize: "11px", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af", margin: "18px 2px 8px" },
  row: { width: "100%", textAlign: "left", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "13px 14px", marginBottom: "9px", display: "flex", gap: "11px", alignItems: "flex-start", cursor: "pointer", fontFamily: "inherit" },
  rowIcon: { width: "36px", height: "36px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: "14px", fontWeight: "600", color: "#111827", lineHeight: 1.3 },
  rowMeta: { fontSize: "11.5px", color: "#6b7280", marginTop: "3px" },
  rejectNote: { fontSize: "11.5px", color: "#b91c1c", marginTop: "4px", lineHeight: 1.4 },
  badge: { fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "999px", whiteSpace: "nowrap", flexShrink: 0 },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "18px 0" },
  emptyState: { textAlign: "center", padding: "50px 16px" },
  emptyIcon: { fontSize: "42px", margin: "0 0 8px 0" },
  emptyTitle: { fontSize: "16px", fontWeight: "600", color: "#374151", margin: "0 0 4px 0" },
  emptyDesc: { fontSize: "13px", color: "#9ca3af", margin: 0, lineHeight: 1.5 },
};
