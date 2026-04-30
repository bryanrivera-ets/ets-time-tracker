# ETS Time Tracker — Progreso del Proyecto

## Información general
- **Proyecto:** Aplicación interna de control de horas para ETS Corporation
- **Responsable:** Bryan Rivera
- **Repositorio GitHub:** https://github.com/bryanrivera-ets/ets-time-tracker
- **URL pública:** https://ets-time-tracker.vercel.app
- **Stack:** React + Vite + JavaScript (por ahora, sin base de datos)
- **Inicio:** 22 de abril de 2026

---

## Fase 1: Setup e Infraestructura ✅ COMPLETADA

Completada el 22 de abril de 2026.

### Lo que se logró:
- [x] Instalado Node.js v24.15.0
- [x] Instalado npm v11.12.1
- [x] Instalado Git v2.54.0
- [x] Instalado VS Code
- [x] Creado proyecto React + Vite localmente
- [x] Primer código propio en App.jsx (pantalla de bienvenida)
- [x] App corriendo en localhost:5173
- [x] Repositorio privado creado en GitHub: bryanrivera-ets/ets-time-tracker
- [x] Primer commit ("first commit") con 16 archivos
- [x] Código subido a GitHub
- [x] Cuenta de Vercel creada con GitHub
- [x] Proyecto desplegado en Vercel
- [x] URL pública funcionando: https://ets-time-tracker.vercel.app
- [x] App probada desde iPhone (Safari)

### Configuración del ambiente:
- **Sistema:** Windows 11
- **Ubicación del proyecto:** C:\Users\Eric B Rivera\ets-time-tracker
- **Terminal:** PowerShell
- **Git user.name:** Bryan Rivera
- **Git user.email:** ericbrivera92@gmail.com

---

## Próximas Fases

### Fase 2: Autenticación y Catálogos (próxima)
Pendiente. Objetivos:
- Elegir entre Firebase o Supabase para base de datos (recomendación: Supabase)
- Implementar autenticación con PIN de 4 dígitos
- CRUD de empleados (crear, leer, actualizar, desactivar)
- CRUD de brigadas con asignación de supervisores
- CRUD de proyectos con números tipo "2026CER80-00157"
- Sistema de roles: supervisor, PM, aprobador HR, admin

### Fase 3: Captura de Horas
Pendiente. Objetivos:
- Pantalla semanal por brigada
- Pantalla individual para PMs
- Cálculo automático de overtime (40h regular, 40-50h OT 1.5, 50+ OT 2)
- Descuento automático de 30 min de almuerzo
- Soporte para cambio de proyecto dentro del día

### Fase 4: Firma y Aprobación
Pendiente. Objetivos:
- Canvas de firma touchscreen
- Panel del aprobador HR con hojas pendientes
- Flujo: Borrador → Firmada → Pendiente → Aprobada
- Exportación a Excel/CSV para nómina

### Fase 5: Reportes y Offline
Pendiente. Objetivos:
- Dashboard con gráficas de horas por proyecto
- Ranking de empleados
- Evolución semanal de OT
- Capacidad offline con sincronización

### Fase 6: Piloto y Lanzamiento
Pendiente. Objetivos:
- Prueba con una brigada real
- Ajustes finales según feedback
- Capacitación del equipo
- Go-live oficial

---

## Notas y decisiones importantes
- La PWA usará autenticación con PIN (no email/password) por facilidad de uso en campo
- Se recomienda Supabase sobre Firebase por mejor manejo de datos estructurados e integración futura con QuickBooks
- Las hojas semanales aprobadas son inmutables para cumplimiento de auditoría
- Los cambios de brigada solo afectan semanas actuales y futuras (nunca pasadas)

---

---

## Fase 2: Autenticación y Catálogos 🔄 EN PROGRESO

Sesión del 23 de abril de 2026.

### Lo que se logró hoy:
- [x] Cuenta de Supabase creada (region East US North Virginia)
- [x] Base de datos diseñada con 6 tablas: employees, brigades, brigade_members, projects, weekly_sheets, time_entries
- [x] Esquema SQL ejecutado exitosamente
- [x] 21 empleados reales cargados (7 con acceso a la app, 14 de brigada)
- [x] 3 brigadas creadas con sus miembros asignados
- [x] Cliente de Supabase instalado en React (@supabase/supabase-js)
- [x] Archivo .env configurado con credenciales
- [x] Archivo src/supabaseClient.js creado como conector
- [x] App.jsx actualizado para mostrar lista de empleados reales
- [x] GRANTs de PostgreSQL configurados para rol anon
- [x] Primera pantalla mostrando datos reales desde la base de datos

### Problemas resueltos durante la sesión:
- Multiples servidores de Vite corriendo en puertos diferentes (5173-5176)
- Clave API legacy vs nueva (publishable): resuelto usando legacy anon key
- RLS bloqueando acceso: desactivado temporalmente en employees, brigades, brigade_members, projects
- GRANTs faltantes: solucionado con GRANT SELECT para rol anon

### Estado actual de seguridad:
- RLS desactivado en: employees, brigades, brigade_members, projects
- RLS activo en: weekly_sheets, time_entries
- GRANT SELECT otorgado al rol anon en todas las tablas principales
- La clave anon está en .env local y .env está en .gitignore
- **Pendiente para próxima sesión:** Reactivar RLS con políticas apropiadas cuando implementemos login

### Vercel:
- **⚠️ Próximo deploy va a fallar** porque las variables de ambiente no están configuradas en Vercel
- Sitio público sigue funcionando con el deploy anterior
- **Pendiente:** Configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el dashboard de Vercel

### Pendientes Fase 2 (próxima sesión):
- [ ] Configurar variables de ambiente en Vercel y redeploy
- [ ] Reactivar RLS con políticas apropiadas
- [ ] Pantalla de login con selección de usuario (prototipo ya diseñado)
- [ ] Autenticación con PIN de 4 dígitos
- [ ] Lógica de bloqueo tras 3 intentos fallidos
- [ ] Pantalla de cuenta para cambiar PIN propio
- [ ] CRUD de proyectos (administrativos crean desde la app)
- [ ] Pestaña admin para gestión de empleados, brigadas y reset de PINs

---

## Para retomar en la próxima sesión

---

## Fase 2 - Sesión 2: Login y Autenticación 🔐

Sesión del 24 de abril de 2026.

### Lo que se logró hoy:

**Vercel:**
- [x] Variables de ambiente configuradas en Vercel (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)
- [x] URL pública funcionando con Supabase: ets-time-tracker.vercel.app
- [x] Deploy automático desde GitHub funcionando

**Pantalla de Login (LoginScreen.jsx):**
- [x] Componente separado en src/components/LoginScreen.jsx
- [x] Lista de los 7 usuarios con acceso (approver, pm, supervisor)
- [x] Agrupación por rol con encabezados
- [x] Avatar con iniciales coloreado por rol
- [x] Badge ADMIN para Bryan y Karla
- [x] Diseño minimalista profesional con card centrada

**Autenticación con PIN:**
- [x] Extensión pgcrypto activada en Supabase
- [x] Función SQL validate_pin con SECURITY DEFINER
- [x] PINs hasheados con bcrypt en la base de datos
- [x] PIN inicial 0000 cargado para los 7 usuarios con acceso
- [x] Lógica de bloqueo: 3 intentos fallidos = 30 segundos bloqueado
- [x] Contadores failed_attempts y locked_until en tabla employees

**Pantalla de PIN (PinScreen.jsx):**
- [x] Teclado numérico de 12 botones (0-9, C, ⌫)
- [x] 4 puntos visuales que se llenan al escribir
- [x] Validación contra Supabase via RPC validate_pin
- [x] Animación shake al fallar
- [x] Soporte de teclado físico Y táctil
- [x] Botón Volver para regresar al login
- [x] Mensajes de error con cuántos intentos quedan
- [x] Auto-redirección al login después de bloqueo

**Navegación entre pantallas:**
- [x] App.jsx actualizado para manejar 3 estados: login, PIN, autenticado
- [x] Pantalla de bienvenida placeholder con botón "Cerrar sesión"

**Seguridad:**
- [x] RLS reactivado en las 6 tablas
- [x] Políticas de SELECT para anon y authenticated
- [x] GRANTs explícitos donde se necesitan
- [x] La función validate_pin usa SECURITY DEFINER para escribir aunque RLS esté activo
- [x] PIN nunca viaja al cliente sin hashear

### Decisiones técnicas importantes:
- PIN inicial 0000 para todos en lugar de PINs únicos (cambiarán al entrar)
- pgcrypto + bcrypt en lugar de hash JavaScript (estándar industrial)
- Función SECURITY DEFINER permite escribir failed_attempts respetando RLS
- Componentes separados en src/components/ para mantenibilidad

### Pendientes Fase 2 (próxima sesión):
- [ ] Pantalla "Cuenta" para que cada usuario cambie su propio PIN
- [ ] Pantalla principal según rol (Aprobador HR vs PM vs Supervisor)
- [ ] CRUD de proyectos (administrativos crean desde la app)
- [ ] Pestaña admin para gestión de empleados, brigadas, reset de PINs
- [ ] Políticas RLS más estrictas para escritura (UPDATE/INSERT/DELETE)

### Estado del proyecto:
```
Fase 1: Setup e Infraestructura    100% ✅
Fase 2: Auth y Catálogos            75% 🔄
Fase 3: Captura de Horas             0% ⏳
Fase 4: Firma y Aprobación           0% ⏳
Fase 5: Reportes y Offline           0% ⏳
Fase 6: Piloto y Lanzamiento         0% ⏳
```

---

## Fase 2 - Sesión 3: Mi Cuenta y Layout con Tabs 🎨

Sesión del 30 de abril de 2026.

### Lo que se logró hoy:

**Feature 1: Mi Cuenta y Cambio de PIN**
- [x] Función SQL change_pin con validaciones (4 dígitos, no 0000, no igual al actual)
- [x] Componente MyAccountScreen.jsx con info del usuario
- [x] Aviso amarillo cuando PIN sigue siendo 0000
- [x] Componente ChangePinScreen.jsx con flujo de 3 pasos
- [x] Validación de PIN actual contra Supabase
- [x] Confirmación de PIN nuevo (paso 3)
- [x] Mensaje de éxito y vuelta automática a Mi Cuenta
- [x] Actualización de pin_changed_at con timestamp

**Feature 2: Layout con Tabs**
- [x] Componente MainLayout.jsx con header sticky y tab bar inferior
- [x] Header con saludo "Hola, [primer nombre]"
- [x] Tabs dinámicas según rol del usuario
- [x] HomeScreen.jsx placeholder con título según rol
- [x] AdminScreen.jsx placeholder con 5 herramientas (empleados, brigadas, proyectos, reset PIN, reportes)
- [x] Tab Admin solo visible para approvers con flag is_admin (Bryan y Karla)
- [x] PMs y Supervisors NO ven tab Admin

### Tabs según rol:
- Approver + Admin (Bryan, Karla): Aprobaciones | Mi Cuenta | Admin
- PM (Jonathan, Raul): Mis Horas | Mi Cuenta
- Supervisor (Leonell, Jose, Luis, Francisco): Mi Brigada | Mi Cuenta

### Decisiones técnicas importantes:
- Los PMs no tienen acceso a Admin (separación de roles por seguridad)
- Pantallas Home son placeholders hasta Fase 3
- Pestaña Admin es placeholder hasta próxima sesión
- change_pin valida del lado del servidor con SECURITY DEFINER

### Pendientes Fase 2 (próxima sesión):
- [ ] Construir CRUD de Empleados (crear, editar, desactivar)
- [ ] Construir CRUD de Brigadas (modificar miembros y supervisores)
- [ ] Construir CRUD de Proyectos
- [ ] Función de Reset de PIN para empleados (solo admin)
- [ ] Políticas RLS más estrictas para escritura

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos                85% 🔄
- Fase 3: Captura de Horas                 0% ⏳
- Fase 4: Firma y Aprobación               0% ⏳
- Fase 5: Reportes y Offline               0% ⏳
- Fase 6: Piloto y Lanzamiento             0% ⏳

### Archivos del proyecto al cierre de la sesión:
- src/App.jsx — manejo de estados de pantalla
- src/supabaseClient.js — conexión a Supabase
- src/components/LoginScreen.jsx — selección de usuario
- src/components/PinScreen.jsx — ingreso de PIN
- src/components/MyAccountScreen.jsx — información personal
- src/components/ChangePinScreen.jsx — flujo de cambio de PIN
- src/components/MainLayout.jsx — header + tabs
- src/components/HomeScreen.jsx — placeholder según rol
- src/components/AdminScreen.jsx — placeholder admin

## Fase 2 - Sesión 4: CRUD Completo de Admin 🛠️

Sesión del 30 de abril de 2026.

### Lo que se logró hoy:

**CRUD de Empleados (AdminScreen.jsx):**
- [x] Lista completa de empleados con búsqueda en tiempo real
- [x] Avatar con iniciales, badge de rol con colores, badge ADMIN e INACTIVO
- [x] Modal de crear empleado (nombre, rol, teléfono, is_admin)
- [x] Modal de editar empleado con toggle activo/inactivo
- [x] Reset de PIN a 0000 con confirmación desde el modal
- [x] Función SQL reset_pin con SECURITY DEFINER

**CRUD de Brigadas (BrigadesView.jsx):**
- [x] Lista de brigadas con supervisor y conteo de miembros
- [x] Modal de editar: nombre, supervisor (dropdown), toggle activo
- [x] Lista de miembros con botón ✕ para remover
- [x] Dropdown para agregar miembro nuevo
- [x] Crear brigada nueva con miembros iniciales
- [x] Sync de miembros: delete + re-insert al guardar

**CRUD de Proyectos (ProjectsView.jsx):**
- [x] Lista separada en ACTIVOS e INACTIVOS
- [x] Búsqueda por nombre, número o cliente
- [x] Estado vacío con mensaje cuando no hay proyectos
- [x] Modal de crear: número, nombre, cliente
- [x] Modal de editar con toggle activo/inactivo
- [x] GRANT INSERT/UPDATE y política RLS para rol anon

**Fix de errores:**
- [x] AdminScreen.jsx faltaba export default (roto en Vercel)
- [x] projects: permission denied → resuelto con GRANT + RLS policy

### Archivos del proyecto al cierre de la sesión:
- src/components/AdminScreen.jsx — CRUD empleados + navegación a secciones
- src/components/BrigadesView.jsx — CRUD brigadas (archivo nuevo)
- src/components/ProjectsView.jsx — CRUD proyectos (archivo nuevo)
- src/components/LoginScreen.jsx
- src/components/PinScreen.jsx
- src/components/MyAccountScreen.jsx
- src/components/ChangePinScreen.jsx
- src/components/MainLayout.jsx
- src/components/HomeScreen.jsx

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas               0% ⏳
- Fase 4: Firma y Aprobación             0% ⏳
- Fase 5: Reportes y Offline             0% ⏳
- Fase 6: Piloto y Lanzamiento           0% ⏳

### Pendientes Fase 3 (próxima sesión):
- [ ] Pantalla semanal de captura de horas para supervisores
- [ ] Pantalla individual para PMs
- [ ] Cálculo de overtime (40h regular, 40-50h OT 1.5x, 50h+ OT 2x)
- [ ] Descuento automático de 60 min de almuerzo

Cuando empiece la Fase 2, usar este mensaje:

> "Hola Claude. Retomo ETS Time Tracker. Ya completé la Fase 1 (setup, GitHub, Vercel, app corriendo). Ahora voy a empezar Fase 2: autenticación con PIN y catálogos. Por favor lee PROGRESO.md del proyecto para el contexto completo."