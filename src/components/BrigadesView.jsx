import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// ─── Brigades List View ────────────────────────────────────────────────────────
export default function BrigadesView({ onBack }) {
  const [brigades, setBrigades] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalBrigade, setModalBrigade] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: brigData }, { data: empData }, { data: membData }] = await Promise.all([
      supabase.from("brigades").select("id, name, supervisor_id, is_active").order("name"),
      supabase.from("employees").select("id, full_name, role").eq("is_active", true).order("full_name"),
      supabase.from("brigade_members").select("brigade_id, employee_id"),
    ]);

    const employees = empData || [];
    const members = membData || [];

    // Attach members and supervisor name to each brigade
    const enriched = (brigData || []).map((b) => {
      const memberIds = members.filter((m) => m.brigade_id === b.id).map((m) => m.employee_id);
      const supervisor = employees.find((e) => e.id === b.supervisor_id);
      return { ...b, memberIds, supervisorName: supervisor?.full_name || "Sin supervisor" };
    });

    setBrigades(enriched);
    setAllEmployees(employees);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div style={s.sectionHeader}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.sectionTitle}>Brigadas</h2>
        <button style={s.addBtn} onClick={() => setModalBrigade({})}>+ Nueva</button>
      </div>

      {loading ? (
        <p style={s.loadingText}>Cargando...</p>
      ) : (
        <div style={s.list}>
          {brigades.map((b) => (
            <button
              key={b.id}
              style={{ ...s.brigadeCard, opacity: b.is_active ? 1 : 0.5 }}
              onClick={() => setModalBrigade(b)}
            >
              <div style={s.brigadeIcon}>🏗</div>
              <div style={s.brigadeInfo}>
                <div style={s.brigadeName}>
                  {b.name}
                  {!b.is_active && <span style={s.inactiveBadge}>INACTIVA</span>}
                </div>
                <div style={s.brigadeMeta}>
                  👤 {b.supervisorName} · {b.memberIds.length} miembro{b.memberIds.length !== 1 ? "s" : ""}
                </div>
              </div>
              <span style={s.arrow}>›</span>
            </button>
          ))}
          {brigades.length === 0 && <p style={s.emptyText}>No hay brigadas registradas.</p>}
        </div>
      )}

      {modalBrigade !== null && (
        <BrigadeModal
          brigade={modalBrigade}
          allEmployees={allEmployees}
          onClose={() => setModalBrigade(null)}
          onSaved={() => { fetchAll(); showToast("Guardado correctamente ✓"); setModalBrigade(null); }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

// ─── Brigade Modal ─────────────────────────────────────────────────────────────
function BrigadeModal({ brigade, allEmployees, onClose, onSaved, onError }) {
  const isNew = !brigade.id;
  const [name, setName] = useState(brigade.name || "");
  const [supervisorId, setSupervisorId] = useState(brigade.supervisor_id || "");
  const [isActive, setIsActive] = useState(brigade.is_active !== false);
  const [memberIds, setMemberIds] = useState(brigade.memberIds || []);
  const [addingId, setAddingId] = useState("");
  const [saving, setSaving] = useState(false);

  const supervisors = allEmployees.filter((e) => e.role === "supervisor" || e.role === "approver" || e.role === "pm");
  const availableToAdd = allEmployees.filter((e) => !memberIds.includes(e.id));
  const memberEmployees = allEmployees.filter((e) => memberIds.includes(e.id));

  async function handleSave() {
    if (!name.trim()) { onError("El nombre de la brigada es requerido."); return; }
    setSaving(true);

    if (isNew) {
      const { data, error } = await supabase
        .from("brigades")
        .insert([{ name: name.trim(), supervisor_id: supervisorId || null, is_active: true }])
        .select()
        .single();
      if (error) { onError("Error al crear: " + error.message); setSaving(false); return; }

      // Insert members
      if (memberIds.length > 0) {
        await supabase.from("brigade_members").insert(
          memberIds.map((eid) => ({ brigade_id: data.id, employee_id: eid }))
        );
      }
    } else {
      // Update brigade info
      const { error } = await supabase.from("brigades").update({
        name: name.trim(),
        supervisor_id: supervisorId || null,
        is_active: isActive,
      }).eq("id", brigade.id);
      if (error) { onError("Error al guardar: " + error.message); setSaving(false); return; }

      // Sync members: delete all, re-insert current
      await supabase.from("brigade_members").delete().eq("brigade_id", brigade.id);
      if (memberIds.length > 0) {
        await supabase.from("brigade_members").insert(
          memberIds.map((eid) => ({ brigade_id: brigade.id, employee_id: eid }))
        );
      }
    }

    setSaving(false);
    onSaved();
  }

  function addMember() {
    if (!addingId || memberIds.includes(addingId)) return;
    setMemberIds((prev) => [...prev, addingId]);
    setAddingId("");
  }

  function removeMember(id) {
    setMemberIds((prev) => prev.filter((m) => m !== id));
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{isNew ? "Nueva Brigada" : "Editar Brigada"}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Name */}
        <div style={s.field}>
          <label style={s.label}>Nombre de la brigada *</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Brigada Norte"
          />
        </div>

        {/* Supervisor */}
        <div style={s.field}>
          <label style={s.label}>Supervisor</label>
          <select style={s.input} value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
            <option value="">— Sin asignar —</option>
            {supervisors.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>

        {/* Active toggle (edit only) */}
        {!isNew && (
          <div style={s.toggleRow}>
            <span style={s.toggleLabel}>✅ Brigada activa</span>
            <button
              style={{ ...s.toggle, background: isActive ? "#16a34a" : "#d1d5db" }}
              onClick={() => setIsActive(!isActive)}
            >
              <div style={{ ...s.toggleThumb, transform: isActive ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>
        )}

        {/* Members */}
        <div style={s.field}>
          <label style={s.label}>Miembros ({memberIds.length})</label>

          {memberEmployees.length > 0 ? (
            <div style={s.memberList}>
              {memberEmployees.map((emp) => (
                <div key={emp.id} style={s.memberRow}>
                  <div style={s.memberAvatar}>
                    {emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <span style={s.memberName}>{emp.full_name}</span>
                  <button style={s.removeBtn} onClick={() => removeMember(emp.id)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={s.emptyMembers}>Sin miembros asignados.</p>
          )}

          {/* Add member */}
          {availableToAdd.length > 0 && (
            <div style={s.addMemberRow}>
              <select
                style={{ ...s.input, flex: 1, marginBottom: 0 }}
                value={addingId}
                onChange={(e) => setAddingId(e.target.value)}
              >
                <option value="">— Agregar miembro —</option>
                {availableToAdd.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <button style={s.addMemberBtn} onClick={addMember} disabled={!addingId}>
                + Agregar
              </button>
            </div>
          )}
        </div>

        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : isNew ? "Crear Brigada" : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { padding: "20px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  addBtn: { background: "#ca8a04", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  brigadeCard: { display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" },
  brigadeIcon: { width: "44px", height: "44px", borderRadius: "12px", background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 },
  brigadeInfo: { flex: 1, minWidth: 0 },
  brigadeName: { fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" },
  brigadeMeta: { fontSize: "12px", color: "#6b7280" },
  inactiveBadge: { fontSize: "10px", fontWeight: "700", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "1px 5px" },
  arrow: { fontSize: "20px", color: "#9ca3af" },
  loadingText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
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
  memberList: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" },
  memberRow: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" },
  memberAvatar: { width: "32px", height: "32px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  memberName: { flex: 1, fontSize: "13px", color: "#111827" },
  removeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px", padding: "2px 6px", borderRadius: "4px" },
  emptyMembers: { fontSize: "13px", color: "#9ca3af", margin: "0 0 10px 0" },
  addMemberRow: { display: "flex", gap: "8px", alignItems: "center" },
  addMemberBtn: { padding: "10px 14px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  saveBtn: { width: "100%", padding: "14px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "8px" },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
};