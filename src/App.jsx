import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import PinScreen from './components/PinScreen'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [pendingUser, setPendingUser] = useState(null)

  function handleUserSelect(user) {
    setPendingUser(user)
  }

  function handleBack() {
    setPendingUser(null)
  }

  function handleLoginSuccess(userData) {
    setCurrentUser(userData)
    setPendingUser(null)
  }

  function handleLogout() {
    setCurrentUser(null)
    setPendingUser(null)
  }

  if (currentUser) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <h1>¡Bienvenido!</h1>
        <h2 style={{ color: '#16a34a' }}>{currentUser.full_name}</h2>
        <p style={{ color: '#6b7280' }}>
          Rol: {currentUser.role} {currentUser.is_admin && '(Admin)'}
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
          ✅ Login funcionando correctamente.<br />
          Próximamente: pantalla principal según tu rol.
        </p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: '30px',
            padding: '10px 20px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (pendingUser) {
    return (
      <PinScreen
        user={pendingUser}
        onBack={handleBack}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  }

  return <LoginScreen onUserSelect={handleUserSelect} />
}