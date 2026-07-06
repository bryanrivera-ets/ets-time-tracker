import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ROLES = {
  approver: { label: 'Aprobadores HR', short: 'Aprobador HR' },
  pm: { label: 'Project Managers', short: 'Project Manager' },
  supervisor: { label: 'Supervisores', short: 'Supervisor' }
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
  const [selectedId, setSelectedId] = useState('')
  const [step, setStep] = useState(1) // 1 = dropdown, 2 = PIN

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

  const selectedUser = employees.find(e => e.id === selectedId)

  const groupedByRole = ROLE_ORDER.reduce((acc, roleKey) => {
    acc[roleKey] = employees.filter(e => e.role === roleKey)
    return acc
  }, {})

  function handleContinue() {
    if (!selectedUser) return
    setStep(2)
  }

  function handleBack() {
    setStep(1)
  }

  function handleUserConfirm() {
    if (!selectedUser) return
    onUserSelect(selectedUser)
  }

  return (
    <div style={s.page}>
      {/* Background image overlay */}
      <div style={s.bgImage} />
      <div style={s.bgOverlay} />

      {/* Card */}
      <div style={s.card}>
        {/* Logo + Title */}
        <div style={s.header}>
          <img src="/ets-logo.png" alt="ETS - Epoxy Technologies Systems" style={s.logoImg} />
          <h1 style={s.title}>ETS Time Tracker</h1>
          <p style={s.subtitle}>CAGUAS, PUERTO RICO</p>
          <div style={s.divider} />
        </div>

        {/* Step 1: Dropdown */}
        {step === 1 && (
          <div>
            <p style={s.stepLabel}>PASO 1 DE 2 · SELECCIONA TU USUARIO</p>

            {loading && <p style={s.loadingText}>Cargando usuarios...</p>}
            {error && <div style={s.errorBox}><strong>Error:</strong> {error}</div>}

            {!loading && !error && (
              <>
                <label style={s.label}>¿Quién eres?</label>
                <div style={s.selectWrap}>
                  <select
                    style={s.select}
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                  >
                    <option value="">— Selecciona tu nombre —</option>
                    {ROLE_ORDER.map(roleKey => {
                      const users = groupedByRole[roleKey]
                      if (!users.length) return null
                      return (
                        <optgroup key={roleKey} label={ROLES[roleKey].label}>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}{u.is_admin ? ' · Admin' : ''}
                            </option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                  <svg style={s.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                <button
                  style={{ ...s.primaryBtn, opacity: selectedId ? 1 : 0.4, cursor: selectedId ? 'pointer' : 'default' }}
                  onClick={handleContinue}
                  disabled={!selectedId}
                >
                  Continuar
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: PIN */}
        {step === 2 && selectedUser && (
          <div>
            <p style={s.stepLabel}>PASO 2 DE 2 · INGRESA TU PIN</p>

            {/* User badge */}
            <div style={s.userBadge}>
              <div style={s.badgeAvatar}>
                {getInitials(selectedUser.full_name)}
              </div>
              <div style={s.badgeInfo}>
                <div style={s.badgeName}>{selectedUser.full_name}</div>
                <div style={s.badgeRole}>
                  {ROLES[selectedUser.role]?.short || selectedUser.role}
                  {selectedUser.is_admin && <span style={s.adminBadge}>ADMIN</span>}
                </div>
              </div>
              <button style={s.changeBtn} onClick={handleBack}>Cambiar</button>
            </div>

            {/* PIN pad */}
            <PinPad user={selectedUser} onSuccess={handleUserConfirm} />
          </div>
        )}

        <p style={s.footer}>Versión 1.0.1 · ETS Corporation</p>
      </div>
    </div>
  )
}

// ─── Inline PIN pad ───────────────────────────────────────────────────────────
function PinPad({ user, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (pin.length === 4) validatePin()
  }, [pin])

  async function validatePin() {
    setChecking(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('validate_pin', {
      employee_id: user.id,
      pin_attempt: pin,
    })
    setChecking(false)
    const isValid = !rpcError && data !== null &&
      JSON.stringify(data).toLowerCase().includes('acceso correcto')
    if (isValid) {
      onSuccess()
    } else {
      setError('PIN incorrecto. Intenta de nuevo.')
      setPin('')
    }
  }

  function pressKey(k) {
    if (checking) return
    if (k === 'C') { setPin(''); setError(''); return }
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 4) return
    setPin(p => p + k)
  }

  return (
    <div>
      {/* Dots */}
      <div style={s.dotsRow}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            ...s.dot,
            background: i < pin.length ? '#1e3a8a' : 'white',
            borderColor: i < pin.length ? '#1e3a8a' : '#d1d5db',
          }} />
        ))}
      </div>

      {error && <p style={s.pinError}>{error}</p>}

      {/* Keypad */}
      <div style={s.keyGrid}>
        {['1','2','3','4','5','6','7','8','9','C','0','DEL'].map(k => (
          <button
            key={k}
            style={{
              ...s.key,
              color: k === 'C' ? '#dc2626' : '#111827',
              fontSize: k === 'DEL' ? '18px' : '20px',
            }}
            onClick={() => pressKey(k)}
            disabled={checking}
          >
            {k === 'DEL' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 12px',
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  bgImage: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url("https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
  },
  bgOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 20, 50, 0.65)',
    zIndex: 1,
  },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '380px',
    background: 'rgba(255,255,255,0.97)',
    borderRadius: '16px',
    padding: '36px 28px 24px',
    boxSizing: 'border-box',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logoImg: {
    width: '200px',
    maxWidth: '80%',
    height: 'auto',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 4px 0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#6b7280',
    margin: '0 0 16px 0',
    letterSpacing: '0.08em',
  },
  divider: {
    height: '1px',
    background: '#f3f4f6',
  },
  stepLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: '0.08em',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  selectWrap: {
    position: 'relative',
    marginBottom: '14px',
  },
  select: {
    width: '100%',
    padding: '11px 40px 11px 14px',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#111827',
    background: '#fff',
    appearance: 'none',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  chevron: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#f0f4ff',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '18px',
  },
  badgeAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#1e3a8a',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeInfo: {
    flex: 1,
    minWidth: 0,
  },
  badgeName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
  badgeRole: {
    fontSize: '11px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  },
  adminBadge: {
    fontSize: '9px',
    fontWeight: '700',
    background: '#fef3c7',
    color: '#92400e',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  changeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  dot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid',
    transition: 'background 0.15s, border-color 0.15s',
  },
  pinError: {
    color: '#dc2626',
    fontSize: '13px',
    textAlign: 'center',
    margin: '0 0 10px 0',
  },
  keyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  key: {
    padding: '14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    background: 'white',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    padding: '24px 0',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '20px',
    marginBottom: 0,
  },
}