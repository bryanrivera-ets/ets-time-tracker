import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// ─── Projects List View ────────────────────────────────────────────────────────
export default function ProjectsView({ onBack, user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProject, setModalProject] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, number, name, client, is_active, created_at")
      .order("created_at", { ascending: false });
    if (!error) setProjects(data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.number?.toLowerCase().includes(search.toLowerCase()) ||
    p.client?.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((p) => p.is_active);
  const inactive = filtered.filter((p) => !p.is_active);

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.sectionHeader}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.sectionTitle}>Proyectos</h2>
        <button style={s.addBtn} onClick={() => setModalProject({})}>+ Nuevo</button>
      </div>

      <div style={s.searchWrap}>
        <input
          style={s.searchInput}
          placeholder="🔍  Buscar por nombre, número o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={s.loadingText}>Cargando...</p>
      ) : (
        <>
          {/* Active projects */}
          {active.length > 0 && (
            <>
              <p style={s.groupLabel}>ACTIVOS ({active.length})</p>
              <div style={s.list}>
                {active.map((p) => <ProjectCard key={p.id} project={p} onClick={() => setModalProject(p)} />)}
              </div>
            </>
          )}

          {/* Inactive projects */}
          {inactive.length > 0 && (
            <>
              <p style={{ ...s.groupLabel, marginTop: "16px" }}>INACTIVOS ({inactive.length})</p>
              <div style={s.list}>
                {inactive.map((p) => <ProjectCard key={p.id} project={p} onClick={() => setModalProject(p)} />)}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <div style={s.emptyState}>
              <p style={s.emptyIcon}>📋</p>
              <p style={s.emptyTitle}>No hay proyectos</p>
              <p style={s.emptyDesc}>Toca "+ Nuevo" para agregar el primer proyecto.</p>
            </div>
          )}
        </>
      )}

      {modalProject !== null && (
        <ProjectModal
          project={modalProject}
          user={user}
          onClose={() => setModalProject(null)}
          onSaved={() => { fetchProjects(); showToast("Guardado correctamente ✓"); setModalProject(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  return (
    <button
      style={{ ...s.projectCard, opacity: project.is_active ? 1 : 0.5 }}
      onClick={onClick}
    >
      <div style={s.projectIcon}>📋</div>
      <div style={s.projectInfo}>
        <div style={s.projectName}>
          {project.name}
          {!project.is_active && <span style={s.inactiveBadge}>INACTIVO</span>}
        </div>
        <div style={s.projectMeta}>
          {project.number && <span style={s.numberTag}>{project.number}</span>}
          {project.client && <span style={s.clientText}>· {project.client}</span>}
        </div>
      </div>
      <span style={s.arrow}>›</span>
    </button>
  );
}

// ─── Project Modal ─────────────────────────────────────────────────────────────
function ProjectModal({ project, user, onClose, onSaved, onError }) {
  const isNew = !project.id;
  const [form, setForm] = useState({
    number: project.number || "",
    name: project.name || "",
    client: project.client || "",
    is_active: project.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { onError("El nombre del proyecto es requerido."); return; }
    setSaving(true);

    if (isNew) {
      const { error } = await supabase.from("projects").insert([{
        number: form.number.trim() || null,
        name: form.name.trim(),
        client: form.client.trim() || null,
        is_active: true,
        created_by: user?.id || null,
      }]);
      if (error) { onError("Error al crear: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("projects").update({
        number: form.number.trim() || null,
        name: form.name.trim(),
        client: form.client.trim() || null,
        is_active: form.is_active,
      }).eq("id", project.id);
      if (error) { onError("Error al guardar: " + error.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{isNew ? "Nuevo Proyecto" : "Editar Proyecto"}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.field}>
          <label style={s.label}>Número de proyecto</label>
          <input
            style={s.input}
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            placeholder="Ej: 2026CER80-00157"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Nombre del proyecto *</label>
          <input
            style={s.input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej: Reconstrucción Pista Rafael Hernández"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Cliente</label>
          <input
            style={s.input}
            value={form.client}
            onChange={(e) => set("client", e.target.value)}
            placeholder="Ej: Autoridad de los Puertos"
          />
        </div>

        {!isNew && (
          <div style={s.toggleRow}>
            <span style={s.toggleLabel}>✅ Proyecto activo</span>
            <button
              style={{ ...s.toggle, background: form.is_active ? "#16a34a" : "#d1d5db" }}
              onClick={() => set("is_active", !form.is_active)}
            >
              <div style={{ ...s.toggleThumb, transform: form.is_active ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>
        )}

        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : isNew ? "Crear Proyecto" : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { padding: "20px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  addBtn: { background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  searchWrap: { marginBottom: "12px" },
  searchInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff", boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
  groupLabel: { fontSize: "11px", fontWeight: "600", color: "#9ca3af", letterSpacing: "0.05em", margin: "0 0 8px 2px" },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  projectCard: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" },
  projectIcon: { width: "40px", height: "40px", borderRadius: "10px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 },
  projectInfo: { flex: 1, minWidth: 0 },
  projectName: { fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  projectMeta: { display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" },
  numberTag: { fontSize: "11px", fontWeight: "600", color: "#16a34a", background: "#dcfce7", borderRadius: "5px", padding: "1px 6px" },
  clientText: { fontSize: "12px", color: "#6b7280" },
  inactiveBadge: { fontSize: "10px", fontWeight: "700", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "1px 5px" },
  arrow: { fontSize: "20px", color: "#9ca3af" },
  loadingText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
  emptyState: { textAlign: "center", padding: "48px 16px" },
  emptyIcon: { fontSize: "40px", margin: "0 0 8px 0" },
  emptyTitle: { fontSize: "16px", fontWeight: "600", color: "#374151", margin: "0 0 4px 0" },
  emptyDesc: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  modalTitle: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: "20px", color: "#6b7280", cursor: "pointer", padding: "4px" },
  field: { marginBottom: "14px" },
  label: { display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "5px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fff" },
  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", padding: "10px 0" },
  toggleLabel: { fontSize: "14px", color: "#374151" },
  toggle: { width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0, padding: 0 },
  toggleThumb: { position: "absolute", top: "2px", left: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  saveBtn: { width: "100%", padding: "14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "4px" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
};