const ROLES = {
  approver: {
    title: 'Aprobaciones',
    subtitle: 'Hojas semanales pendientes de aprobar',
    icon: '✓',
    color: '#16a34a',
    bg: '#dcfce7'
  },
  pm: {
    title: 'Mis Horas',
    subtitle: 'Registra tus horas de la semana',
    icon: '⏱',
    color: '#ca8a04',
    bg: '#fef9c3'
  },
  supervisor: {
    title: 'Mi Brigada',
    subtitle: 'Registra las horas de tu brigada',
    icon: '👥',
    color: '#2563eb',
    bg: '#dbeafe'
  }
}

export default function HomeScreen({ user }) {
  const config = ROLES[user.role] || ROLES.supervisor

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>{config.title}</h1>
        <p style={styles.subtitle}>{config.subtitle}</p>

        <div style={styles.placeholderCard}>
          <div
            style={{
              ...styles.iconBox,
              background: config.bg,
              color: config.color
            }}
          >
            {config.icon}
          </div>
          <h2 style={styles.placeholderTitle}>
            Próximamente
          </h2>
          <p style={styles.placeholderText}>
            Esta pantalla la construiremos en la <strong>Fase 3</strong>.
          </p>
          <p style={styles.placeholderHint}>
            {user.role === 'approver' &&
              'Aquí verás todas las hojas semanales pendientes de aprobación, podrás revisarlas y aprobarlas.'}
            {user.role === 'pm' &&
              'Aquí podrás registrar tus horas semanales por proyecto, firmar tu hoja y enviarla a aprobación.'}
            {user.role === 'supervisor' &&
              'Aquí podrás registrar las horas diarias de toda tu brigada, organizarlas por proyecto y enviar la hoja a aprobación.'}
          </p>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>—</div>
            <div style={styles.statLabel}>Esta semana</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>—</div>
            <div style={styles.statLabel}>Total horas</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>—</div>
            <div style={styles.statLabel}>Pendientes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: '20px 12px 100px 12px',
    background: '#f9fafb',
    minHeight: 'calc(100vh - 80px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  container: {
    width: '100%',
    maxWidth: '420px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 20px 0'
  },
  placeholderCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '32px 20px',
    textAlign: 'center',
    marginBottom: '16px',
    border: '1px dashed #d1d5db'
  },
  iconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    marginBottom: '12px'
  },
  placeholderTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0'
  },
  placeholderText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 8px 0'
  },
  placeholderHint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
    lineHeight: 1.6
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '2px'
  },
  statLabel: {
    fontSize: '10px',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  }
}