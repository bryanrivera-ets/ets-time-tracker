import BrigadeWeekScreen from "./BrigadeWeekScreen";
import PMWeekScreen from "./PMWeekScreen";
import ApprovalsScreen from "./ApprovalsScreen";

export default function HomeScreen({ user }) {
  if (user.role === "supervisor") {
    return <BrigadeWeekScreen user={user} />;
  }

  if (user.role === "pm") {
    return <PMWeekScreen user={user} />;
  }

  if (user.role === "approver") {
    return <ApprovalsScreen user={user} />;
  }

  return (
    <div style={s.page}>
      <div style={s.emptyState}>
        <p style={s.emptyIcon}>👋</p>
        <p style={s.emptyTitle}>Bienvenido</p>
        <p style={s.emptyDesc}>Selecciona una opción del menú inferior.</p>
      </div>
    </div>
  );
}

const s = {
  page: { padding: "20px 12px 100px", background: "#f9fafb", minHeight: "calc(100vh - 80px)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  emptyState: { textAlign: "center", padding: "60px 16px" },
  emptyIcon: { fontSize: "48px", margin: "0 0 8px 0" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#374151", margin: "0 0 4px 0" },
  emptyDesc: { fontSize: "13px", color: "#9ca3af", margin: 0 },
};