import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ROLES = {
  approver: { label: 'Aprobadores HR', short: 'Aprobador HR', color: '#16a34a', bg: '#dcfce7' },
  pm: { label: 'Project Managers', short: 'Project Manager', color: '#ca8a04', bg: '#fef9c3' },
  supervisor: { label: 'Supervisores', short: 'Supervisor', color: '#2563eb', bg: '#dbeafe' }
}

const ROLE_ORDER = ['approver', 'pm', 'supervisor']

function getInitials(name) {
  return name
    .split(' ')
    .filter(w => w.length > 1)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function LoginScreen({ onUserSelect }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
          .in('role', ['supervisor', 'pm', 'approver'])
          .order('full_name')

        if (error) throw error
        setEmployees(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const groupedByRole = ROLE_ORDER.reduce((acc, roleKey) => {
    acc[roleKey] = employees.filter(e => e.role === roleKey)
    return acc
  }, {})

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>⏱</div>
          <h1 style={styles.title}>ETS Time Tracker</h1>
          <p style={styles.subtitle}>Caguas, Puerto Rico</p>
          <div style={styles.divider}></div>
          <p style={styles.stepLabel}>Paso 1 de 2 · Selecciona tu usuario</p>
        </div>

        {loading && (
          <p style={styles.loading}>Cargando usuarios...</p>
        )}

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <div style={styles.groupsContainer}>
            {ROLE_ORDER.map(roleKey => {
              const users = groupedByRole[roleKey]
              if (users.length === 0) return null

              return (
                <div key={roleKey} style={styles.group}>
                  <div style={styles.groupHeader}>
                    {ROLES[roleKey].label}
                  </div>
                  <div style={styles.userList}>
                    {users.map(user => (
                      <button
                        key={user.id}
                        style={styles.userButton}
                        onClick={() => onUserSelect(user)}
                      >
                        <div
                          style={{
                            ...styles.avatar,
                            background: user.is_admin ? '#fef3c7' : ROLES[roleKey].bg,
                            color: user.is_admin ? '#92400e' : ROLES[roleKey].color
                          }}
                        >
                          {getInitials(user.full_name)}
                        </div>
                        <div style={styles.userInfo}>
                          <div style={styles.userNameRow}>
                            <span style={styles.userName}>{user.full_name}</span>
                            {user.is_admin && (
                              <span style={styles.adminBadge}>ADMIN</span>
                            )}
                          </div>
                          <div style={styles.userRole}>
                            {ROLES[roleKey].short}
                          </div>
                        </div>
                        <span style={styles.arrow}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p style={styles.footer}>
          Versión 0.0.3 · ETS Corporation
        </p>
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
    padding: '32px 20px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: '#dbeafe',
    color: '#2563eb',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    marginBottom: '12px'
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
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '16px 0'
  },
  stepLabel: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    padding: '40px 0'
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px'
  },
  groupsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  groupHeader: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    paddingLeft: '4px'
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    width: '100%'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: 0
  },
  userInfo: {
    flex: 1,
    minWidth: 0
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
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
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  arrow: {
    fontSize: '20px',
    color: '#9ca3af',
    fontWeight: '300'
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '24px',
    marginBottom: '0'
  }
}