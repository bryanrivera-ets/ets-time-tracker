import { supabase } from '../supabaseClient'

const ROLES = {
  approver: { short: 'Aprobador HR', color: '#16a34a', bg: '#dcfce7' },
  pm: { short: 'Project Manager', color: '#ca8a04', bg: '#fef9c3' },
  supervisor: { short: 'Supervisor', color: '#2563eb', bg: '#dbeafe' }
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(w => w.length > 1)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function formatDate(isoDate) {
  if (!isoDate) return null
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-PR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export default function MyAccountScreen({ user, onChangePin, onLogout }) {
  const role = ROLES[user.role] || ROLES.supervisor
  const usingDefaultPin = !user.pin_changed_at

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Mi Cuenta</h1>
        <p style={styles.subtitle}>Información personal y seguridad</p>

        {/* Tarjeta de información del usuario */}
        <div style={styles.userCard}>
          <div
            style={{
              ...styles.avatar,
              background: user.is_admin ? '#fef3c7' : role.bg,
              color: user.is_admin ? '#92400e' : role.color
            }}
          >
            {getInitials(user.full_name)}
          </div>
          <div style={styles.userInfo}>
            <h2 style={styles.userName}>{user.full_name}</h2>
            <p style={styles.userRole}>
              {role.short}
              {user.is_admin && <span style={styles.adminBadge}>ADMIN</span>}
            </p>
          </div>
        </div>

        {/* Detalles */}
        <div style={styles.detailsCard}>
          <div style={styles.sectionTitle}>Información</div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Teléfono</span>
            <span style={styles.detailValue}>{user.phone || '—'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Rol</span>
            <span style={styles.detailValue}>
              {role.short}
              {user.is_admin && ' · Administrador'}
            </span>
          </div>
        </div>

        {/* Aviso de PIN inicial */}
        {usingDefaultPin && (
          <div style={styles.warningBox}>
            <strong>⚠️ Estás usando el PIN inicial (0000)</strong>
            <p style={styles.warningText}>
              Te recomendamos cambiarlo cuanto antes por uno propio.
            </p>
          </div>
        )}

        {/* Sección de seguridad */}
        <div style={styles.detailsCard}>
          <div style={styles.sectionTitle}>Seguridad</div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>PIN actual</span>
            <span style={styles.detailValue}>
              {user.pin_changed_at
                ? `Cambiado el ${formatDate(user.pin_changed_at)}`
                : 'PIN inicial (0000)'}
            </span>
          </div>

          <button style={styles.primaryButton} onClick={onChangePin}>
            Cambiar PIN
          </button>
        </div>

        {/* Cerrar sesión */}
        <button style={styles.dangerButton} onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px 12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  container: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    padding: '24px 20px',
    boxSizing: 'border-box'
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#111827'
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 20px 0'
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '16px'
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    flexShrink: 0
  },
  userInfo: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0'
  },
  userRole: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  adminBadge: {
    fontSize: '9px',
    fontWeight: '700',
    background: '#fef3c7',
    color: '#92400e',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.5px'
  },
  detailsCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    color: '#6b7280'
  },
  detailValue: {
    color: '#111827',
    fontWeight: '500',
    textAlign: 'right'
  },
  warningBox: {
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '16px',
    color: '#92400e',
    fontSize: '13px'
  },
  warningText: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#92400e'
  },
  primaryButton: {
    width: '100%',
    padding: '12px',
    marginTop: '12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  dangerButton: {
    width: '100%',
    padding: '12px',
    background: '#ffffff',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
}