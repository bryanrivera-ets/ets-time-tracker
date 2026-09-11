import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { groupBySection } from "../utils/evaluationHelpers";

export default function CriteriaView({ onBack }) {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchCriteria(); }, []);

  async function fetchCriteria() {
    setLoading(true);
    const { data } = await supabase
      .from("evaluation_criteria")
      .select("*")
      .order("sort_order");
    setCriteria(data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const active = criteria.filter((c) => c.is_active !== false);
  const inactive = criteria.filter((c) => c.is_active === false);
  const sections = groupBySection(active);
  const knownSections = [...new Set(criteria.map((c) => c.section))];

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.title}>Criterios</h2>
        <button style={s.addBtn} onClick={() => setModal({})}>+ Nuevo</button>
      </div>

      <p style={s.intro}>
        Estos son los criterios de la Evaluación de Cierre de Proyecto. Los cambios aplican
        a las evaluaciones nuevas; las ya firmadas conservan lo que se puntuó en su momento.
      </p>

      {loading ? (
        <p style={s.loading}>Cargando…</p>
      ) : (
        <>
          {sections.map((section) => (
            <div key={section.name}>
              <div style={s.sectionHead}>
                <span>{section.name}</span>
                <span style={s.sectionCount}>{section.items.length}</span>
              </div>
              <div style={s.card}>
                {section.items.map((c, i) => (
                  <button
                    key={c.id}
                    style={{ ...s.row, borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}
                    onClick={() => setModal(c)}
                  >
                    <span style={s.order}>{c.sort_order}</span>
                    <span style={s.label}>{c.label}</span>
                    <span style={s.arrow}>›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {inactive.length > 0 && (
            <>
              <div style={s.sectionHead}>
                <span style={{ color: "#9ca3af" }}>Retirados</span>
                <span style={s.sectionCount}>{inactive.length}</span>
              </div>
              <div style={s.card}>
                {inactive.map((c, i) => (
                  <button
                    key={c.id}
                    style={{ ...s.row, borderTop: i > 0 ? "1px solid #f3f4f6" : "none", opacity: 0.55 }}
                    onClick={() => setModal(c)}
                  >
                    <span style={s.order}>{c.sort_order}</span>
                    <span style={s.label}>{c.label}</span>
                    <span style={s.arrow}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {criteria.length === 0 && (
            <p style={s.empty}>
              No hay criterios cargados. Corre el SQL de la migración o añade uno con “+ Nuevo”.
            </p>
          )}
        </>
      )}

      {modal !== null && (
        <CriterionModal
          criterion={modal}
          sections={knownSections}
          nextOrder={(Math.max(0, ...criteria.map((c) => c.sort_order || 0)) + 10)}
          onClose={() => setModal(null)}
          onSaved={(msg) => { fetchCriteria(); showToast(msg); setModal(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      <div style={{ height: "40px" }} />
    </div>
  );
}

function CriterionModal({ criterion, sections, nextOrder, onClose, onSaved, onError }) {
  const isNew = !criterion.id;
  const [form, setForm] = useState({
    section: criterion.section || sections[0] || "",
    label: criterion.label || "",
    sort_order: criterion.sort_order ?? nextOrder,
    is_active: criterion.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.label.trim()) { onError("El criterio necesita un texto."); return; }
    if (!form.section.trim()) { onError("Escoge o escribe una sección."); return; }

    setSaving(true);
    const payload = {
      section: form.section.trim(),
      label: form.label.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const { error } = isNew
      ? await supabase.from("evaluation_criteria").insert(payload)
      : await supabase.from("evaluation_criteria").update(payload).eq("id", criterion.id);

    setSaving(false);
    if (error) { onError("No se pudo guardar: " + error.message); return; }
    onSaved(isNew ? "Criterio creado ✓" : "Criterio actualizado ✓");
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.modalTitle}>{isNew ? "Nuevo criterio" : "Editar criterio"}</h3>

        <div style={s.field}>
          <label style={s.fieldLabel} htmlFor="cr-label">Criterio</label>
          <textarea
            id="cr-label"
            style={{ ...s.input, minHeight: "70px", resize: "vertical" }}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ej. Cumplimiento con normas de seguridad"
          />
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel} htmlFor="cr-section">Sección</label>
          <input
            id="cr-section"
            style={s.input}
            list="cr-sections"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="Ej. Seguridad y orden"
          />
          <datalist id="cr-sections">
            {sections.map((sec) => <option key={sec} value={sec} />)}
          </datalist>
        </div>

        <div style={s.field}>
          <label style={s.fieldLabel} htmlFor="cr-order">Orden</label>
          <input
            id="cr-order"
            type="number"
            style={s.input}
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
          <p style={s.help}>Número más bajo aparece primero. Ve de 10 en 10 para dejar espacio.</p>
        </div>

        {!isNew && (
          <label style={s.toggle} htmlFor="cr-active">
            <input
              id="cr-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              style={s.checkbox}
            />
            <span>Activo — aparece en evaluaciones nuevas</span>
          </label>
        )}

        <div style={s.modalActions}>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button style={s.cancelBtn} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: "16px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" },
  backBtn: { background: "none", border: "none", fontSize: "15px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 },
  addBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 13px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  intro: { fontSize: "12.5px", color: "#6b7280", lineHeight: 1.5, margin: "0 2px 14px" },
  loading: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "30px 0" },
  empty: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "30px 16px", lineHeight: 1.5 },

  sectionHead: { display: "flex", alignItems: "baseline", fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#2563eb", margin: "16px 2px 8px" },
  sectionCount: { marginLeft: "auto", fontSize: "11px", color: "#9ca3af", letterSpacing: 0 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0 14px", marginBottom: "10px" },
  row: { width: "100%", display: "flex", gap: "10px", alignItems: "center", padding: "12px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  order: { fontSize: "11px", color: "#9ca3af", fontVariantNumeric: "tabular-nums", minWidth: "24px", flexShrink: 0 },
  label: { flex: 1, fontSize: "13.5px", color: "#374151", lineHeight: 1.4 },
  arrow: { color: "#d1d5db", fontSize: "18px", flexShrink: 0 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "400px", maxHeight: "88vh", overflowY: "auto" },
  modalTitle: { fontSize: "17px", fontWeight: "600", color: "#111827", margin: "0 0 16px" },
  field: { marginBottom: "13px" },
  fieldLabel: { display: "block", fontSize: "11px", fontWeight: "600", color: "#6b7280", marginBottom: "5px" },
  input: { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: "14px", color: "#111827", padding: "10px", border: "1px solid #e5e7eb", borderRadius: "9px", background: "#fff" },
  help: { fontSize: "11.5px", color: "#9ca3af", margin: "5px 0 0" },
  toggle: { display: "flex", gap: "10px", alignItems: "center", fontSize: "13.5px", color: "#374151", margin: "4px 0 16px", cursor: "pointer" },
  checkbox: { width: "18px", height: "18px", accentColor: "#2563eb", cursor: "pointer" },
  modalActions: { display: "flex", gap: "10px" },
  saveBtn: { flex: 1, padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  cancelBtn: { flex: 1, padding: "12px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
};
