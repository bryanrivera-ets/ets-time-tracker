import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
          .order('full_name')

        if (error) throw error
        setEmployees(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1>ETS Time Tracker</h1>
      <p style={{ color: 'gray' }}>Caguas, Puerto Rico</p>
      <p style={{ color: 'gray', fontSize: '14px' }}>
        Versión 0.0.2 — Conectado a Supabase
      </p>

      <hr style={{ margin: '24px 0' }} />

      <h2>Empleados registrados</h2>

      {loading && <p>Cargando empleados...</p>}

      {error && (
        <div style={{ background: '#fee', padding: '12px', borderRadius: '4px', color: '#c00' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {employees.map((emp) => (
            <li
              key={emp.id}
              style={{
                padding: '10px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>{emp.full_name}</strong>
                {emp.is_admin && (
                  <span
                    style={{
                      background: '#fd0',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginLeft: '8px',
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </span>
              <span style={{ color: 'gray', fontSize: '14px' }}>{emp.role}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && employees.length > 0 && (
        <p style={{ color: 'gray', fontSize: '12px', marginTop: '20px' }}>
          Total: {employees.length} empleados activos
        </p>
      )}
    </div>
  )
}

export default App