import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import PinScreen from './components/PinScreen'
import MainLayout from './components/MainLayout'
import ChangePinScreen from './components/ChangePinScreen'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [pendingUser, setPendingUser] = useState(null)
  const [view, setView] = useState('main') // 'main' | 'changePin'

  function handleUserSelect(user) {
    setPendingUser(user)
  }

  function handleBack() {
    setPendingUser(null)
  }

  function handleLoginSuccess(userData) {
    setCurrentUser(userData)
    setPendingUser(null)
    setView('main')
  }

  function handleLogout() {
    setCurrentUser(null)
    setPendingUser(null)
    setView('main')
  }

  function handleChangePin() {
    setView('changePin')
  }

  function handleChangePinCancel() {
    setView('main')
  }

  function handleChangePinSuccess() {
    setCurrentUser({
      ...currentUser,
      pin_changed_at: new Date().toISOString()
    })
    setView('main')
  }

  // Usuario autenticado
  if (currentUser) {
    if (view === 'changePin') {
      return (
        <ChangePinScreen
          user={currentUser}
          onCancel={handleChangePinCancel}
          onSuccess={handleChangePinSuccess}
        />
      )
    }

    return (
      <MainLayout
        user={currentUser}
        onChangePin={handleChangePin}
        onLogout={handleLogout}
      />
    )
  }

  // Usuario en proceso de login
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