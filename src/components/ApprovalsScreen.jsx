import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ApprovalDetailScreen from "./ApprovalDetailScreen";

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

const STATUS_CONFIG = {
  submitted: { label: "Pendiente", bg: "#fef9c3", color: "#92400e", icon: "⏳" },
  approved:  { label: "Aprobada",  bg: "#dcfce7", color: "#166534", icon: "✅" },
  draft:     { label: "Borrador",  bg: "#f3f4f6", color: "#6b7280", icon: "✏️" },
};

export default function ApprovalsScreen({ user }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("submitted"); // submitted | approved | all
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchSheets(); }, [filter]);

  async function fetchSheets() {
    setLoading(true);

    let query = supabase
      .from("weekly_sheets")
      .select("id, owner_type, owner_id, week_start, status, signature, signed_at, submitted_at, approved_at, rejection_note")
      .order("submitted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    } else {
      query = query.in("status", ["submitted", "approved"]);
    }

    const { data: sheetsData } = await query;
    const rawSheets = sheetsData || [];

    // Enrich with owner names
    const brigadeIds = rawSheets.filter((s) => s.owner_type === "brigade").map((s) => s.owner_id);
    const pmIds = rawSheets.filter((s) => s.owner_type === "pm").map((s) => s.owner_id);

    const [{ data: brigData }, { data: empData }] = await Promise.all([
      brigadeIds.length > 0
        ? supabase.from("brigades").select("id, name").in("id", brigadeIds)
        : Promise.resolve({ data: [] }),
      pmIds.length > 0
        ? supabase.from("employees").select("id, full_name").in("id", pmIds)
        : Promise.resolve({ data: [] }),
    ]);

    const enriched = rawSheets.map((s) => {
      if (s.owner_type === "brigade") {
        const brig = (brigData || []).find((b) => b.id === s.owner_id);
        return { ...s, ownerName: brig?.name || "Brigada desconocida", ownerIcon: "🏗" };
      } else {
        const emp = (empData || []).find((e) => e.id === s.owner_id);
        return { ...s, ownerName: emp?.full_name || "PM desconocido", ownerIcon: "👤" };
      }
    });

    setSheets(enriched);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  if (selectedSheet) {
    return (
      <ApprovalDetailScreen
        sheet={selectedSheet}
        user={user}
        onBack={() => setSelectedSheet(null)}
        onActionDone={() => {
          setSelectedSheet(null);
          fetchSheets();
          showToast("Acción completada ✓");
        }}
      />
    );
  }

  const pendingCount = sheets.filter((s) => s.status === "submitted").length;

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "success" ? "#16a34a" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Aprobaciones</h1>
        {pendingCount > 0 && (
          <div style={s.pendingBadge}>{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={s.filterRow}>
        {[
          { key: "submitted", label: "Pendientes" },
          { key: "approved", label: "Aprobadas" },
          { key: "all", label: "Todas" },
        ].map((f) => (
          <button
            key={f.key}
            style={{
              ...s.filterBtn,
              background: filter === f.key ? "#2563eb" : "#fff",
              color: filter === f.key ? "#fff" : "#6b7280",
              border: filter === f.key ? "1px solid #2563eb" : "1px solid #e5e7eb",
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={s.loadingText}>Cargando...</p>
      ) : sheets.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyIcon}>{filter === "submitted" ? "🎉" : "📋"}</p>
          <p style={s.emptyTitle}>
            {filter === "submitted" ? "Todo al día" : "Sin hojas aquí"}
          </p>
          <p style={s.emptyDesc}>
            {filter === "submitted" ? "No hay hojas pendientes de aprobación." : "No hay hojas en esta categoría."}
          </p>
        </div>
      ) : (
        <div style={s.list}>
          {sheets.map((sheet) => {
            const sc = STATUS_CONFIG[sheet.status] || STATUS_CONFIG.draft;
            const weekStart = new Date(sheet.week_start + "T12:00:00");
            const weekEnd = addDays(weekStart, 6);
            const weekLabel = `${weekStart.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}`;
            const submittedLabel = sheet.submitted_at
              ? new Date(sheet.submitted_at).toLocaleDateString("es-PR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : null;

            return (
              <button
                key={sheet.id}
                style={s.sheetCard}
                onClick={() => setSelectedSheet(sheet)}
              >
                <div style={s.sheetLeft}>
                  <div style={s.ownerIcon}>{sheet.ownerIcon}</div>
                  <div style={s.sheetInfo}>
                    <div style={s.ownerName}>{sheet.ownerName}</div>
                    <div style={s.weekLabel}>{weekLabel}</div>
                    {submittedLabel && (
                      <div style={s.submittedLabel}>Enviada {submittedLabel}</div>
                    )}
                    {sheet.signature && (
                      <div style={s.signedBy}>Firmada por {sheet.signature}</div>
                    )}
                  </div>
                </div>
                <div style={s.sheetRight}>
                  <span style={{ ...s.statusBadge, background: sc.bg, color: sc.color }}>
                    {sc.icon} {sc.label}
                  </span>
                  <span style={s.arrow}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding: "16px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  toast: { position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", zIndex: 2000, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  header: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" },
  title: { fontSize: "22px", fontWeight: "600", color: "#111827", margin: 0 },
  pendingBadge: { background: "#dc2626", color: "#fff", fontSize: "12px", fontWeight: "700", borderRadius: "20px", padding: "2px 10px" },
  filterRow: { display: "flex", gap: "6px", marginBottom: "14px" },
  filterBtn: { flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
  loadingText: { textAlign: "center", color: "#9ca3af", marginTop: "40px" },
  emptyState: { textAlign: "center", padding: "60px 16px" },
  emptyIcon: { fontSize: "48px", margin: "0 0 8px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 4px" },
  emptyDesc: { fontSize: "13px", color: "#9ca3af" },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  sheetCard: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%" },
  sheetLeft: { display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 },
  ownerIcon: { fontSize: "24px", flexShrink: 0 },
  sheetInfo: { flex: 1, minWidth: 0 },
  ownerName: { fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "2px" },
  weekLabel: { fontSize: "12px", color: "#6b7280", marginBottom: "2px" },
  submittedLabel: { fontSize: "11px", color: "#9ca3af" },
  signedBy: { fontSize: "11px", color: "#9ca3af" },
  sheetRight: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  statusBadge: { fontSize: "11px", fontWeight: "600", borderRadius: "6px", padding: "3px 8px" },
  arrow: { fontSize: "20px", color: "#9ca3af" },
};