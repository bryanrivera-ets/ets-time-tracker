import { useState } from 'react'
import HomeScreen from './HomeScreen'
import MyAccountScreen from './MyAccountScreen'
import AdminScreen from './AdminScreen'

const ROLES = {
  approver: { home: 'Aprobaciones', icon: '✓' },
  pm: { home: 'Mis Horas', icon: '⏱' },
  supervisor: { home: 'Mi Brigada', icon: '👥' }
}

export default function MainLayout({ user, onChangePin, onLogout }) {
  const [activeTab, setActiveTab] = useState('home')

  // Determinar qué tabs mostrar según rol
  const tabs = [
    { id: 'home', label: ROLES[user.role]?.home || 'Inicio', icon: ROLES[user.role]?.icon || '🏠' },
    { id: 'account', label: 'Mi Cuenta', icon: '👤' }
  ]

  // Solo approvers con flag admin tienen acceso a Admin
  const canAccessAdmin = user.role === 'approver' && user.is_admin
  if (canAccessAdmin) {
    tabs.push({ id: 'admin', label: 'Admin', icon: '⚙' })
  }

  return (
    <div style={styles.layout}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerLogo}>⏱</div>
          <div>
            <div style={styles.headerTitle}>ETS Time Tracker</div>
            <div style={styles.headerSubtitle}>Hola, {user.full_name.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* Contenido principal según tab */}
      <div style={styles.content}>
        {activeTab === 'home' && <HomeScreen user={user} />}
        {activeTab === 'account' && (
          <MyAccountScreen
            user={user}
            onChangePin={onChangePin}
            onLogout={onLogout}
          />
        )}
        {activeTab === 'admin' && canAccessAdmin && <AdminScreen user={user} />}
      </div>

      {/* Bottom Tabs */}
      <div style={styles.tabBar}>
        <div style={{
          ...styles.tabBarInner,
          gridTemplateColumns: `repeat(${tabs.length}, 1fr)`
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tabButton,
                  color: isActive ? '#2563eb' : '#6b7280',
                  background: isActive ? '#eff6ff' : 'transparent'
                }}
              >
                <div style={styles.tabIcon}>{tab.icon}</div>
                <div style={{
                  ...styles.tabLabel,
                  fontWeight: isActive ? '600' : '500'
                }}>
                  {tab.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    minHeight: '100vh',
    background: '#f9fafb',
    paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
    position: 'relative'
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    maxWidth: '420px',
    margin: '0 auto'
  },
  headerLogo: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: '#dbeafe',
    color: '#2563eb',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  content: {
    minHeight: 'calc(100vh - 64px - 80px)'
  },
  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    boxShadow: '0 -1px 3px rgba(0,0,0,0.04)',
    zIndex: 10,
    paddingBottom: 'env(safe-area-inset-bottom)'
  },
  tabBarInner: {
    maxWidth: '420px',
    margin: '0 auto',
    display: 'grid',
    padding: '8px'
  },
  tabButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 4px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    minHeight: '56px'
  },
  tabIcon: {
    fontSize: '20px'
  },
  tabLabel: {
    fontSize: '11px'
  }
}