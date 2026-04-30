import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ChangePinScreen({ user, onCancel, onSuccess }) {
  const [step, setStep] = useState('current')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [shaking, setShaking] = useState(false)

  const activePin =
    step === 'current' ? currentPin :
    step === 'new' ? newPin :
    step === 'confirm' ? confirmPin : ''

  const setActivePin = (val) => {
    if (step === 'current') setCurrentPin(val)
    else if (step === 'new') setNewPin(val)
    else if (step === 'confirm') setConfirmPin(val)
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (step === 'saving' || step === 'success') return
      if (e.key >= '0' && e.key <= '9') addDigit(e.key)
      else if (e.key === 'Backspace') deleteDigit()
      else if (e.key === 'Escape') clearPin()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [step, currentPin, newPin, confirmPin])

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  function addDigit(digit) {
    setErrorMsg('')
    if (activePin.length >= 4) return
    const newVal = activePin + digit
    setActivePin(newVal)
    if (newVal.length === 4) {
      setTimeout(() => handleStepComplete(newVal), 200)
    }
  }

  function deleteDigit() {
    setErrorMsg('')
    setActivePin(activePin.slice(0, -1))
  }

  function clearPin() {
    setErrorMsg('')
    setActivePin('')
  }

  async function handleStepComplete(pinValue) {
    if (step === 'current') {
      setStep('new')
    } else if (step === 'new') {
      if (pinValue === '0000') {
        setErrorMsg('No puedes usar 0000')
        triggerShake()
        setActivePin('')
        return
      }
      if (pinValue === currentPin) {
        setErrorMsg('El PIN nuevo debe ser diferente al actual')
        triggerShake()
        setActivePin('')
        return
      }
      setStep('confirm')
    } else if (step === 'confirm') {
      if (pinValue !== newPin) {
        setErrorMsg('Los PINs no coinciden')
        triggerShake()
        setNewPin('')
        setConfirmPin('')
        setStep('new')
        return
      }
      await saveNewPin()
    }
  }

  async function saveNewPin() {
    setStep('saving')
    setErrorMsg('')
    try {
      const { data, error } = await supabase.rpc('change_pin', {
        employee_id: user.id,
        current_pin: currentPin,
        new_pin: newPin
      })

      if (error) {
        setErrorMsg('Error de conexión: ' + error.message)
        triggerShake()
        resetFlow()
        return
      }

      const result = data[0]
      if (result.success) {
        setStep('success')
        setTimeout(() => onSuccess(), 1500)
      } else {
        setErrorMsg(result.message)
        triggerShake()
        resetFlow()
      }
    } catch (err) {
      setErrorMsg('Error inesperado: ' + err.message)
      triggerShake()
      resetFlow()
    }
  }

  function resetFlow() {
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setStep('current')
  }

  function pressKey(key) {
    if (step === 'saving' || step === 'success') return
    if (key === 'del') return deleteDigit()
    if (key === 'clear') return clearPin()
    addDigit(key)
  }

  const stepInfo = {
    current: { title: 'Paso 1 de 3', subtitle: 'Ingresa tu PIN actual' },
    new: { title: 'Paso 2 de 3', subtitle: 'Crea un PIN nuevo de 4 dígitos' },
    confirm: { title: 'Paso 3 de 3', subtitle: 'Confirma tu PIN nuevo' },
    saving: { title: '', subtitle: 'Guardando...' },
    success: { title: '', subtitle: '¡PIN actualizado!' }
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
        {step !== 'saving' && step !== 'success' && (
          <button style={styles.backButton} onClick={onCancel}>
            ← Cancelar
          </button>
        )}

        <h1 style={styles.title}>Cambiar PIN</h1>

        <p style={styles.stepLabel}>
          {stepInfo[step].title} · {stepInfo[step].subtitle}
        </p>

        {step === 'success' ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <p style={styles.successText}>PIN actualizado correctamente</p>
          </div>
        ) : step === 'saving' ? (
          <p style={styles.loadingText}>Guardando...</p>
        ) : (
          <>
            <div
              style={{
                ...styles.dotsContainer,
                animation: shaking ? 'shake 0.4s' : 'none'
              }}
            >
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < activePin.length ? '#111827' : 'transparent',
                    borderColor: i < activePin.length ? '#111827' : '#d1d5db'
                  }}
                />
              ))}
            </div>

            <div style={styles.messageRow}>
              {errorMsg ? (
                <p style={styles.errorMsg}>{errorMsg}</p>
              ) : (
                <p style={styles.hintMsg}>
                  {step === 'new' ? '4 dígitos · No puede ser 0000' : '\u00A0'}
                </p>
              )}
            </div>

            <div style={styles.keypad}>
              {keypadKeys.map((row, rowIdx) =>
                row.map(key => (
                  <button
                    key={`${rowIdx}-${key}`}
                    onClick={() => pressKey(key)}
                    style={{
                      ...styles.keypadButton,
                      ...(key === 'del' ? styles.keypadButtonDelete : {}),
                      ...(key === 'clear' ? styles.keypadButtonClear : {})
                    }}
                  >
                    {key === 'del' ? '⌫' : key === 'clear' ? 'C' : key}
                  </button>
                ))
              )}
            </div>
          </>
        )}
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
    fontFamily: 'inherit',
    marginBottom: '8px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
    textAlign: 'center'
  },
  stepLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0 0 24px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
  successBox: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#16a34a',
    fontSize: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  successText: {
    fontSize: '15px',
    color: '#16a34a',
    fontWeight: '600',
    margin: 0
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    padding: '60px 0'
  }
}