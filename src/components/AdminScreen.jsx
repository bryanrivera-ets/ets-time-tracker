import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import BrigadesView from "./BrigadesView";
import ProjectsView from "./ProjectsView";

const ROLES = ["approver", "pm", "supervisor", "worker"];

const ROLE_LABELS = {
  approver: "Aprobador HR",
  pm: "Project Manager",
  supervisor: "Supervisor",
  worker: "Trabajador",
};

const ROLE_COLORS = {
  approver: { color: "#7c3aed", bg: "#ede9fe" },
  pm: { color: "#2563eb", bg: "#dbeafe" },
  supervisor: { color: "#ca8a04", bg: "#fef9c3" },
  worker: { color: "#374151", bg: "#f3f4f6" },
};

// ─── Employee List View ────────────────────────────────────────────────────────
function EmployeesView({ onBack }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalEmployee, setModalEmployee] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, role, phone, is_admin, is_active, pin_hash")
      .order("full_name");
    if (!error) setEmployees(data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}
      <div style={s.sectionHeader}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.sectionTitle}>Empleados</h2>
        <button style={s.addBtn} onClick={() => setModalEmployee({})}>+ Nuevo</button>
      </div>
      <div style={s.searchWrap}>
        <input
          style={s.searchInput}
          placeholder="🔍  Buscar empleado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <p style={s.loadingText}>Cargando...</p>
      ) : (
        <div style={s.list}>
          {filtered.map((emp) => {
            const rc = ROLE_COLORS[emp.role] || ROLE_COLORS.worker;
            return (
              <button
                key={emp.id}
                style={{ ...s.empCard, opacity: emp.is_active ? 1 : 0.5 }}
                onClick={() => setModalEmployee(emp)}
              >
                <div style={s.avatar}>
                  {emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div style={s.empInfo}>
                  <div style={s.empName}>
                    {emp.full_name}
                    {emp.is_admin && <span style={s.adminBadge}>ADMIN</span>}
                    {!emp.is_active && <span style={s.inactiveBadge}>INACTIVO</span>}
                  </div>
                  <span style={{ ...s.roleBadge, color: rc.color, background: rc.bg }}>
                    {ROLE_LABELS[emp.role] || emp.role}
                  </span>
                </div>
                <span style={s.arrow}>›</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p style={s.emptyText}>No se encontraron empleados.</p>}
        </div>
      )}
      {modalEmployee !== null && (
        <EmployeeModal
          employee={modalEmployee}
          onClose={() => setModalEmployee(null)}
          onSaved={() => { fetchEmployees(); showToast("Guardado correctamente ✓"); setModalEmployee(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

// ─── Employee Modal ────────────────────────────────────────────────────────────
function EmployeeModal({ employee, onClose, onSaved, onError }) {
  const isNew = !employee.id;
  const [form, setForm] = useState({
    full_name: employee.full_name || "",
    role: employee.role || "worker",
    phone: employee.phone || "",
    is_admin: employee.is_admin || false,
    is_active: employee.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.full_name.trim()) { onError("El nombre es requerido."); return; }
    setSaving(true);
    if (isNew) {
      const { error } = await supabase.from("employees").insert([{
        full_name: form.full_name.trim(),
        role: form.role,
        phone: form.phone.trim() || null,
        is_admin: form.is_admin,
        is_active: true,
        failed_attempts: 0,
      }]);
      if (error) { onError("Error al crear: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("employees").update({
        full_name: form.full_name.trim(),
        role: form.role,
        phone: form.phone.trim() || null,
        is_admin: form.is_admin,
        is_active: form.is_active,
      }).eq("id", employee.id);
      if (error) { onError("Error al guardar: " + error.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  async function handleResetPin() {
    setResetting(true);
    const { error } = await supabase.rpc("reset_pin", { target_employee_id: employee.id });
    setResetting(false);
    setConfirmReset(false);
    if (error) { onError("Error al resetear PIN: " + error.message); return; }
    onError("PIN reseteado a 0000 ✓");
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{isNew ? "Nuevo Empleado" : "Editar Empleado"}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.field}>
          <label style={s.label}>Nombre completo *</label>
          <input
            style={s.input}
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Ej: Juan García"
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Rol</label>
          <select style={s.input} value={form.role} onChange={(e) => set("role", e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div style={s.field}>
          <label style={s.label}>Teléfono</label>
          <input
            style={s.input}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="787-000-0000"
            type="tel"
          />
        </div>
        <div style={s.toggleRow}>
          <span style={s.toggleLabel}>🔐 Acceso Admin</span>
          <button
            style={{ ...s.toggle, background: form.is_admin ? "#2563eb" : "#d1d5db" }}
            onClick={() => set("is_admin", !form.is_admin)}
          >
            <div style={{ ...s.toggleThumb, transform: form.is_admin ? "translateX(20px)" : "translateX(0)" }} />
          </button>
        </div>
        {!isNew && (
          <div style={s.toggleRow}>
            <span style={s.toggleLabel}>✅ Empleado activo</span>
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
          {saving ? "Guardando..." : isNew ? "Crear Empleado" : "Guardar Cambios"}
        </button>
        {!isNew && (
          <div style={s.resetSection}>
            <div style={s.divider} />
            {!confirmReset ? (
              <button style={s.resetBtn} onClick={() => setConfirmReset(true)}>
                🔑 Resetear PIN a 0000
              </button>
            ) : (
              <div style={s.confirmBox}>
                <p style={s.confirmText}>¿Seguro? El empleado tendrá que cambiar su PIN al entrar.</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={s.confirmYes} onClick={handleResetPin} disabled={resetting}>
                    {resetting ? "..." : "Sí, resetear"}
                  </button>
                  <button style={s.confirmNo} onClick={() => setConfirmReset(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AdminScreen ──────────────────────────────────────────────────────────
export default function AdminScreen({ user }) {
  const [activeSection, setActiveSection] = useState(null);

  if (activeSection === "empleados") {
    return <EmployeesView onBack={() => setActiveSection(null)} />;
  }

  if (activeSection === "brigadas") {
    return <BrigadesView onBack={() => setActiveSection(null)} />;
  }

  if (activeSection === "proyectos") {
    return <ProjectsView onBack={() => setActiveSection(null)} user={user} />;
  }

  const adminTools = [
    { key: "empleados", title: "Empleados", desc: "Crear, editar y desactivar empleados", icon: "👥", color: "#2563eb", bg: "#dbeafe" },
    { key: "brigadas", title: "Brigadas", desc: "Modificar miembros y supervisores", icon: "🏗", color: "#ca8a04", bg: "#fef9c3" },
    { key: "proyectos", title: "Proyectos", desc: "Catálogo de proyectos activos", icon: "📋", color: "#16a34a", bg: "#dcfce7" },
    { key: "reset", title: "Reset de PIN", desc: "Restablecer PIN de empleados", icon: "🔑", color: "#dc2626", bg: "#fee2e2" },
    { key: "reportes", title: "Reportes", desc: "Exportes y resúmenes para nómina", icon: "📊", color: "#7c3aed", bg: "#ede9fe" },
  ];

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}>Administración</h1>
        <p style={s.subtitle}>Herramientas exclusivas para administradores</p>
        <div style={s.adminBadgeBox}>
          <strong>🔐 Acceso restringido</strong>
          <p style={s.adminBadgeText}>Solo Bryan y Karla tienen acceso a esta sección.</p>
        </div>
        <div style={s.toolsGrid}>
          {adminTools.map((tool) => (
            <button
              key={tool.key}
              style={s.toolCard}
              onClick={() => {
                if (tool.key === "empleados") setActiveSection("empleados");
                else if (tool.key === "brigadas") setActiveSection("brigadas");
                else if (tool.key === "proyectos") setActiveSection("proyectos");
                else alert(`Próximamente: ${tool.title}`);
              }}
            >
              <div style={{ ...s.toolIcon, background: tool.bg, color: tool.color }}>{tool.icon}</div>
              <div style={s.toolText}>
                <div style={s.toolTitle}>{tool.title}</div>
                <div style={s.toolDesc}>{tool.desc}</div>
              </div>
              <span style={s.arrowIcon}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { padding: "20px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  container: { width: "100%", maxWidth: "420px", margin: "0 auto" },
  title: { fontSize: "24px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" },
  subtitle: { fontSize: "13px", color: "#6b7280", margin: "0 0 16px 0" },
  adminBadgeBox: { background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px", color: "#92400e", fontSize: "13px" },
  adminBadgeText: { margin: "4px 0 0 0", fontSize: "12px" },
  toolsGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  toolCard: { display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" },
  toolIcon: { width: "44px", height: "44px", borderRadius: "12px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 },
  toolText: { flex: 1, minWidth: 0 },
  toolTitle: { fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "2px" },
  toolDesc: { fontSize: "12px", color: "#6b7280" },
  arrowIcon: { fontSize: "20px", color: "#9ca3af", fontWeight: "300" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  addBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  searchWrap: { marginBottom: "12px" },
  searchInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff", boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  empCard: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empInfo: { flex: 1, minWidth: 0 },
  empName: { fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  adminBadge: { fontSize: "10px", fontWeight: "700", color: "#7c3aed", background: "#ede9fe", borderRadius: "4px", padding: "1px 5px" },
  inactiveBadge: { fontSize: "10px", fontWeight: "700", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "1px 5px" },
  roleBadge: { fontSize: "11px", fontWeight: "500", borderRadius: "6px", padding: "2px 7px", display: "inline-block" },
  arrow: { fontSize: "20px", color: "#9ca3af" },
  loadingText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
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
  saveBtn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "4px" },
  resetSection: { marginTop: "8px" },
  divider: { height: "1px", background: "#f3f4f6", margin: "16px 0" },
  resetBtn: { width: "100%", padding: "12px", background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" },
  confirmBox: { background: "#fff7f7", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px" },
  confirmText: { fontSize: "13px", color: "#7f1d1d", margin: "0 0 10px 0" },
  confirmYes: { flex: 1, padding: "8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { flex: 1, padding: "8px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
};