import { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import MainLayout from './components/MainLayout'
import ChangePinScreen from './components/ChangePinScreen'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('main') // 'main' | 'changePin'

  function handleLoginSuccess(user) {
    setCurrentUser(user)
    setView('main')
  }

  function handleLogout() {
    setCurrentUser(null)
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

  // Login — PIN ya está integrado dentro de LoginScreen
  return <LoginScreen onUserSelect={handleLoginSuccess} />
}