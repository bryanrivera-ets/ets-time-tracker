import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ROLE_LABELS = {
  approver: "Aprobador HR",
  pm: "Project Manager",
  supervisor: "Supervisor",
  employee: "Empleado",
};

const ROLE_COLORS = {
  approver: { color: "#7c3aed", bg: "#ede9fe" },
  pm: { color: "#2563eb", bg: "#dbeafe" },
  supervisor: { color: "#ca8a04", bg: "#fef9c3" },
  employee: { color: "#374151", bg: "#f3f4f6" },
};

export default function ResetPinView({ onBack }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, role, is_admin, is_active, pin_changed_at")
      .eq("is_active", true)
      .order("full_name");
    setEmployees(data || []);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleReset(employeeId) {
    setResetting(true);
    const { error } = await supabase.rpc("reset_pin", { target_employee_id: employeeId });
    setResetting(false);
    setConfirmId(null);
    if (error) {
      showToast("Error al resetear PIN: " + error.message, "error");
      return;
    }
    showToast("PIN reseteado a 0000 ✓");
    fetchEmployees();
  }

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Employees with app access (approver, pm, supervisor) first
  const withAccess = filtered.filter((e) => ["approver", "pm", "supervisor"].includes(e.role));
  const withoutAccess = filtered.filter((e) => !["approver", "pm", "supervisor"].includes(e.role));

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>‹ Admin</button>
        <h2 style={s.title}>Reset de PIN</h2>
        <div />
      </div>

      {/* Info banner */}
      <div style={s.infoBanner}>
        <span style={s.infoIcon}>🔑</span>
        <div>
          <div style={s.infoTitle}>Restablecer PIN a 0000</div>
          <div style={s.infoDesc}>El empleado deberá cambiar su PIN al entrar por primera vez.</div>
        </div>
      </div>

      {/* Search */}
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
        <>
          {/* With app access */}
          {withAccess.length > 0 && (
            <>
              <p style={s.groupLabel}>CON ACCESO A LA APP ({withAccess.length})</p>
              <div style={s.list}>
                {withAccess.map((emp) => (
                  <EmployeeResetRow
                    key={emp.id}
                    emp={emp}
                    confirmId={confirmId}
                    resetting={resetting}
                    onConfirm={() => setConfirmId(emp.id)}
                    onCancel={() => setConfirmId(null)}
                    onReset={() => handleReset(emp.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Without app access */}
          {withoutAccess.length > 0 && (
            <>
              <p style={{ ...s.groupLabel, marginTop: "14px" }}>SIN ACCESO A LA APP ({withoutAccess.length})</p>
              <div style={s.list}>
                {withoutAccess.map((emp) => (
                  <EmployeeResetRow
                    key={emp.id}
                    emp={emp}
                    confirmId={confirmId}
                    resetting={resetting}
                    onConfirm={() => setConfirmId(emp.id)}
                    onCancel={() => setConfirmId(null)}
                    onReset={() => handleReset(emp.id)}
                  />
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <p style={s.emptyText}>No se encontraron empleados.</p>
          )}
        </>
      )}
    </div>
  );
}

function EmployeeResetRow({ emp, confirmId, resetting, onConfirm, onCancel, onReset }) {
  const rc = ROLE_COLORS[emp.role] || ROLE_COLORS.employee;
  const isConfirming = confirmId === emp.id;
  const hasChangedPin = !!emp.pin_changed_at;

  return (
    <div style={s.empCard}>
      <div style={s.empLeft}>
        <div style={s.avatar}>
          {emp.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div style={s.empInfo}>
          <div style={s.empName}>
            {emp.full_name}
            {emp.is_admin && <span style={s.adminBadge}>ADMIN</span>}
          </div>
          <div style={s.empMeta}>
            <span style={{ ...s.roleBadge, color: rc.color, background: rc.bg }}>
              {ROLE_LABELS[emp.role] || emp.role}
            </span>
            <span style={{ ...s.pinStatus, color: hasChangedPin ? "#16a34a" : "#d97706" }}>
              {hasChangedPin ? "· PIN personalizado" : "· PIN = 0000"}
            </span>
          </div>
        </div>
      </div>

      <div style={s.empRight}>
        {!isConfirming ? (
          <button style={s.resetBtn} onClick={onConfirm}>
            🔑 Resetear
          </button>
        ) : (
          <div style={s.confirmInline}>
            <p style={s.confirmText}>¿Resetear a 0000?</p>
            <div style={s.confirmBtns}>
              <button
                style={s.confirmYes}
                onClick={onReset}
                disabled={resetting}
              >
                {resetting ? "..." : "Sí"}
              </button>
              <button style={s.confirmNo} onClick={onCancel}>No</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: "12px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" },
  backBtn: { background: "none", border: "none", fontSize: "16px", color: "#2563eb", cursor: "pointer", padding: "4px 0", fontFamily: "inherit" },
  title: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 },
  infoBanner: { display: "flex", alignItems: "center", gap: "12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px 14px", marginBottom: "14px" },
  infoIcon: { fontSize: "24px", flexShrink: 0 },
  infoTitle: { fontSize: "13px", fontWeight: "600", color: "#92400e" },
  infoDesc: { fontSize: "12px", color: "#92400e", marginTop: "2px" },
  searchWrap: { marginBottom: "12px" },
  searchInput: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", background: "#fff", boxSizing: "border-box", fontFamily: "inherit", outline: "none" },
  groupLabel: { fontSize: "11px", fontWeight: "600", color: "#9ca3af", letterSpacing: "0.05em", margin: "0 0 8px 2px" },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  empCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
  empLeft: { display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 },
  avatar: { width: "38px", height: "38px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empInfo: { flex: 1, minWidth: 0 },
  empName: { fontSize: "13px", fontWeight: "500", color: "#111827", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "3px" },
  adminBadge: { fontSize: "10px", fontWeight: "700", color: "#7c3aed", background: "#ede9fe", borderRadius: "4px", padding: "1px 5px" },
  empMeta: { display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" },
  roleBadge: { fontSize: "11px", fontWeight: "500", borderRadius: "6px", padding: "2px 7px" },
  pinStatus: { fontSize: "11px", fontWeight: "500" },
  empRight: { flexShrink: 0 },
  resetBtn: { background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  confirmInline: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" },
  confirmText: { fontSize: "12px", color: "#7f1d1d", margin: 0, fontWeight: "500" },
  confirmBtns: { display: "flex", gap: "6px" },
  confirmYes: { padding: "6px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  confirmNo: { padding: "6px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "7px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" },
  loadingText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: "14px", marginTop: "24px" },
};