export default function AdminScreen({ user }) {
  const adminTools = [
    {
      title: 'Empleados',
      desc: 'Crear, editar y desactivar empleados',
      icon: '👥',
      color: '#2563eb',
      bg: '#dbeafe'
    },
    {
      title: 'Brigadas',
      desc: 'Modificar miembros y supervisores',
      icon: '🏗',
      color: '#ca8a04',
      bg: '#fef9c3'
    },
    {
      title: 'Proyectos',
      desc: 'Catálogo de proyectos activos',
      icon: '📋',
      color: '#16a34a',
      bg: '#dcfce7'
    },
    {
      title: 'Reset de PIN',
      desc: 'Restablecer PIN de empleados',
      icon: '🔑',
      color: '#dc2626',
      bg: '#fee2e2'
    },
    {
      title: 'Reportes',
      desc: 'Exportes y resúmenes para nómina',
      icon: '📊',
      color: '#7c3aed',
      bg: '#ede9fe'
    }
  ]

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Administración</h1>
        <p style={styles.subtitle}>
          Herramientas exclusivas para administradores
        </p>

        <div style={styles.adminBadgeBox}>
          <strong>🔐 Acceso restringido</strong>
          <p style={styles.adminBadgeText}>
            Solo Bryan y Karla tienen acceso a esta sección.
          </p>
        </div>

        <div style={styles.toolsGrid}>
          {adminTools.map(tool => (
            <button
              key={tool.title}
              style={styles.toolCard}
              onClick={() => alert(`Próximamente: ${tool.title}`)}
            >
              <div
                style={{
                  ...styles.toolIcon,
                  background: tool.bg,
                  color: tool.color
                }}
              >
                {tool.icon}
              </div>
              <div style={styles.toolText}>
                <div style={styles.toolTitle}>{tool.title}</div>
                <div style={styles.toolDesc}>{tool.desc}</div>
              </div>
              <span style={styles.arrow}>›</span>
            </button>
          ))}
        </div>

        <p style={styles.footer}>
          Estas funciones se construirán en la próxima sesión.
        </p>
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
    margin: '0 auto'
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
    margin: '0 0 16px 0'
  },
  adminBadgeBox: {
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '16px',
    color: '#92400e',
    fontSize: '13px'
  },
  adminBadgeText: {
    margin: '4px 0 0 0',
    fontSize: '12px'
  },
  toolsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  toolCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    width: '100%'
  },
  toolIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0
  },
  toolText: {
    flex: 1,
    minWidth: 0
  },
  toolTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '2px'
  },
  toolDesc: {
    fontSize: '12px',
    color: '#6b7280'
  },
  arrow: {
    fontSize: '20px',
    color: '#9ca3af',
    fontWeight: '300'
  },
  footer: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: '8px'
  }
}