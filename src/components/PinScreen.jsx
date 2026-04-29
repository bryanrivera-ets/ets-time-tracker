import { useState, useEffect, useRef } from 'react'
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

export default function PinScreen({ user, onBack, onLoginSuccess }) {
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [warningMsg, setWarningMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const dotsRef = useRef(null)

  const role = ROLES[user.role] || ROLES.supervisor

  useEffect(() => {
    function handleKeyDown(e) {
      if (loading) return
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key)
      } else if (e.key === 'Backspace') {
        deleteDigit()
      } else if (e.key === 'Escape') {
        clearPin()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pin, loading])

  function addDigit(digit) {
    setErrorMsg('')
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      setTimeout(() => validatePin(newPin), 200)
    }
  }

  function deleteDigit() {
    setErrorMsg('')
    setPin(p => p.slice(0, -1))
  }

  function clearPin() {
    setErrorMsg('')
    setPin('')
  }

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  async function validatePin(pinValue) {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('validate_pin', {
        employee_id: user.id,
        pin_attempt: pinValue
      })

      if (error) {
        setErrorMsg('Error de conexión: ' + error.message)
        triggerShake()
        setPin('')
        return
      }

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          onLoginSuccess(result.user_data)
        } else {
          setErrorMsg(result.message)
          triggerShake()
          setPin('')
          if (result.message.includes('Bloqueado')) {
            setTimeout(() => onBack(), 1500)
          }
        }
      }
    } catch (err) {
      setErrorMsg('Error inesperado: ' + err.message)
      triggerShake()
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function pressKey(key) {
    if (loading) return
    if (key === 'del') return deleteDigit()
    if (key === 'clear') return clearPin()
    addDigit(key)
  }

  const keypadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'del']
  ]

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button style={styles.backButton} onClick={onBack}>
          ← Volver
        </button>

        <div style={styles.userInfo}>
          <div
            style={{
              ...styles.avatar,
              background: user.is_admin ? '#fef3c7' : role.bg,
              color: user.is_admin ? '#92400e' : role.color
            }}
          >
            {getInitials(user.full_name)}
          </div>
          <h2 style={styles.userName}>{user.full_name}</h2>
          <p style={styles.userRole}>
            {role.short}
            {user.is_admin && <span style={styles.adminBadge}>ADMIN</span>}
          </p>
        </div>

        <p style={styles.stepLabel}>
          Paso 2 de 2 · Entra tu PIN de 4 dígitos
        </p>

        <div
          ref={dotsRef}
          style={{
            ...styles.dotsContainer,
            transform: shaking ? 'translateX(0)' : 'none',
            animation: shaking ? 'shake 0.4s' : 'none'
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i < pin.length ? '#111827' : 'transparent',
                borderColor: i < pin.length ? '#111827' : '#d1d5db'
              }}
            />
          ))}
        </div>

        <div style={styles.messageRow}>
          {errorMsg && (
            <p style={styles.errorMsg}>{errorMsg}</p>
          )}
          {!errorMsg && warningMsg && (
            <p style={styles.warningMsg}>{warningMsg}</p>
          )}
          {!errorMsg && !warningMsg && (
            <p style={styles.hintMsg}>
              💡 PIN inicial: 0000 (cámbialo después)
            </p>
          )}
        </div>

        <div style={styles.keypad}>
          {keypadKeys.map((row, rowIdx) =>
            row.map(key => (
              <button
                key={`${rowIdx}-${key}`}
                onClick={() => pressKey(key)}
                disabled={loading}
                style={{
                  ...styles.keypadButton,
                  ...(key === 'del' ? styles.keypadButtonDelete : {}),
                  ...(key === 'clear' ? styles.keypadButtonClear : {}),
                  opacity: loading ? 0.5 : 1
                }}
              >
                {key === 'del' ? '⌫' : key === 'clear' ? 'C' : key}
              </button>
            ))
          )}
        </div>

        <p style={styles.footer}>
          {loading ? 'Verificando...' : 'Usa el teclado físico o táctil'}
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
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
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 0',
    fontFamily: 'inherit'
  },
  userInfo: {
    textAlign: 'center',
    marginTop: '12px',
    marginBottom: '20px'
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '10px'
  },
  userName: {
    fontSize: '18px',
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
    justifyContent: 'center',
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
  stepLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 16px 0',
    fontWeight: '500'
  },
  dotsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    marginBottom: '8px'
  },
  dot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '1.5px solid #d1d5db',
    transition: 'all 0.15s'
  },
  messageRow: {
    minHeight: '20px',
    textAlign: 'center',
    marginBottom: '20px'
  },
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    margin: 0,
    fontWeight: '500'
  },
  warningMsg: {
    fontSize: '12px',
    color: '#d97706',
    margin: 0,
    fontWeight: '500'
  },
  hintMsg: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: 0
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    maxWidth: '280px',
    margin: '0 auto'
  },
  keypadButton: {
    height: '60px',
    fontSize: '24px',
    fontWeight: '500',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#111827',
    transition: 'all 0.1s',
    userSelect: 'none'
  },
  keypadButtonDelete: {
    color: '#dc2626',
    fontSize: '20px'
  },
  keypadButtonClear: {
    color: '#6b7280',
    fontSize: '16px'
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '20px',
    marginBottom: 0
  }
}