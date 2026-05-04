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

## Fase 3 - Sesión 1: Captura de Horas para Supervisores ⏱️

Sesión del 1 de mayo de 2026.

### Lo que se logró hoy:

**BrigadeWeekScreen.jsx (archivo nuevo):**
- [x] Pantalla principal de captura de horas para supervisores
- [x] Muestra la brigada asignada al supervisor automáticamente
- [x] Navegación entre semanas (← →) con badge "Esta semana"
- [x] Tabs de días Lun-Dom con fecha y punto verde si tiene horas
- [x] Domingo resaltado en rojo automáticamente
- [x] Día de hoy resaltado con borde azul
- [x] Grid de empleados con 7 celdas por empleado
- [x] Cada celda muestra horas + rango de tiempo si tiene entradas
- [x] Resumen semanal por empleado: Regular / OT×1.5 / OT×2
- [x] Lógica de OT: 0-40h regular, 40h+ OT×1.5, domingos OT×2
- [x] Crea weekly_sheet automáticamente si no existe
- [x] Estado locked cuando hoja está aprobada o enviada

**DayEntryModal.jsx (archivo nuevo):**
- [x] Modal de entrada/salida por empleado por día
- [x] Time picker de entrada y salida
- [x] Botones de almuerzo: Sin almuerzo / 30 min / 60 min
- [x] Dropdown de proyecto activo
- [x] Soporte de múltiples bloques de horas (cambio de proyecto en el día)
- [x] Botón "+ Agregar bloque de horas"
- [x] Cálculo de horas netas por bloque en tiempo real
- [x] Total del día calculado automáticamente
- [x] Botón para borrar horas del día
- [x] Tag OT×2 visible cuando es domingo

**HomeScreen.jsx (actualizado):**
- [x] Supervisores ven BrigadeWeekScreen en tab "Mi Brigada"
- [x] PMs y Aprobadores ven placeholder hasta Fase 3/4

**Base de datos:**
- [x] Columna lunch_minutes añadida a time_entries (default 30)
- [x] GRANTs y políticas RLS para INSERT/UPDATE/DELETE/SELECT en time_entries
- [x] GRANTs y políticas RLS para INSERT/UPDATE/SELECT en weekly_sheets

### Archivos del proyecto al cierre de la sesión:
- src/components/BrigadeWeekScreen.jsx — pantalla semanal supervisor (nuevo)
- src/components/DayEntryModal.jsx — modal de entrada de horas (nuevo)
- src/components/HomeScreen.jsx — actualizado con routing por rol
- src/components/AdminScreen.jsx
- src/components/BrigadesView.jsx
- src/components/ProjectsView.jsx
- src/components/LoginScreen.jsx
- src/components/PinScreen.jsx
- src/components/MyAccountScreen.jsx
- src/components/ChangePinScreen.jsx
- src/components/MainLayout.jsx

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas               40% 🔄
- Fase 4: Firma y Aprobación              0% ⏳
- Fase 5: Reportes y Offline              0% ⏳
- Fase 6: Piloto y Lanzamiento            0% ⏳

### Pendientes Fase 3 (próxima sesión):
- [ ] Verificar que funciona en Vercel (RLS policies)
- [ ] Pantalla de captura individual para PMs
- [ ] Resumen semanal con totales de horas por proyecto
- [ ] Validación de solapamiento de bloques en el mismo día
- [ ] PIN de firma del supervisor al enviar la hoja

## Fase 3 - Sesión 2: Resumen Semanal, Firma y Pantalla de PMs ✍️

Sesión del 1 de mayo de 2026.

### Lo que se logró hoy:

**WeekSummaryScreen.jsx (archivo nuevo):**
- [x] Pantalla de resumen semanal accesible desde botón en Mi Brigada
- [x] Card azul con total de horas de la semana
- [x] Desglose por empleado con horas regular / OT×1.5 / OT×2
- [x] Desglose por proyecto con conteo de empleados
- [x] Flujo de firma con PIN en 3 pasos: botón → confirmación → PIN
- [x] Teclado numérico de PIN integrado en la misma pantalla
- [x] Fix: parámetro correcto pin_attempt (no pin_input) en validate_pin
- [x] Al firmar: status → submitted, guarda signature, signed_at, submitted_at
- [x] Banner de estado cuando hoja está enviada o aprobada
- [x] Hoja bloqueada (solo lectura) después de firmar

**BrigadeWeekScreen.jsx (actualizado):**
- [x] Botón "✍️ Resumen y Firmar" en header de la pantalla
- [x] Badge de status (Borrador / Enviada / Aprobada)
- [x] Total de horas de la semana visible en el header
- [x] Navegación a WeekSummaryScreen

**PMWeekScreen.jsx (archivo nuevo):**
- [x] Pantalla de captura individual para Project Managers
- [x] Grid de 7 días (Lun-Dom) con card por día
- [x] Modal simplificado: total de horas + proyecto (sin entrada/salida)
- [x] Botones rápidos de horas: 4h, 6h, 8h, 10h, 12h
- [x] Soporte de múltiples bloques (cambio de proyecto en el día)
- [x] Cálculo de OT semanal en tiempo real
- [x] Resumen y firma via WeekSummaryScreen (reutilizado)
- [x] Fix: owner_type = "pm" (no "employee") — constraint de DB

**Fixes de DB:**
- [x] GRANT EXECUTE en validate_pin, reset_pin, change_pin para rol anon
- [x] Limpieza de time_entries con sheet_id NULL

### Archivos del proyecto al cierre de la sesión:
- src/components/WeekSummaryScreen.jsx — resumen y firma (nuevo)
- src/components/BrigadeWeekScreen.jsx — actualizado con resumen
- src/components/PMWeekScreen.jsx — captura para PMs (nuevo)
- src/components/HomeScreen.jsx — actualizado con routing PM
- src/components/DayEntryModal.jsx
- src/components/AdminScreen.jsx
- src/components/BrigadesView.jsx
- src/components/ProjectsView.jsx
- src/components/LoginScreen.jsx
- src/components/PinScreen.jsx
- src/components/MyAccountScreen.jsx
- src/components/ChangePinScreen.jsx
- src/components/MainLayout.jsx

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas               90% 🔄
- Fase 4: Firma y Aprobación              0% ⏳
- Fase 5: Reportes y Offline              0% ⏳
- Fase 6: Piloto y Lanzamiento            0% ⏳

### Pendientes Fase 3 (próxima sesión):
- [ ] Validación de solapamiento de bloques en el mismo día
- [ ] Completar Fase 3 al 100% y arrancar Fase 4

### Pendientes Fase 4 (próxima):
- [ ] Panel de aprobación para Bryan y Karla
- [ ] Lista de hojas enviadas pendientes de aprobación
- [ ] Aprobar / rechazar hojas con comentario
- [ ] Exportación a Excel/CSV para nómina

## Fase 3 - Sesión 3: Validación y Cierre de Fase 3 ✅

Sesión del 1 de mayo de 2026.

### Lo que se logró hoy:

**DayEntryModal.jsx (actualizado):**
- [x] Validación de solapamiento entre bloques de horas
- [x] Función checkOverlaps que compara todos los pares de bloques
- [x] Error específico indicando qué bloques se solapan y sus horarios
- [x] Bloquea el guardado hasta que el solapamiento se corrija

**Fixes adicionales:**
- [x] PMWeekScreen: owner_type corregido de "employee" a "pm"
- [x] GRANT EXECUTE en validate_pin, reset_pin, change_pin para rol anon
- [x] Limpieza de time_entries con sheet_id NULL
- [x] Verificado funcionamiento completo en Vercel (supervisores y PMs)

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas              100% ✅
- Fase 4: Firma y Aprobación              0% ⏳
- Fase 5: Reportes y Offline              0% ⏳
- Fase 6: Piloto y Lanzamiento            0% ⏳

### Pendientes Fase 4 (próxima sesión):
- [ ] Panel de aprobación para Bryan y Karla (approvers)
- [ ] Lista de hojas enviadas pendientes de aprobación
- [ ] Ver detalle de hoja antes de aprobar
- [ ] Aprobar hoja — cambia status a "approved"
- [ ] Rechazar hoja con comentario — regresa a "draft"
- [ ] Exportación a Excel/CSV para nómina

## Fase 4 - Sesión 1: Panel de Aprobaciones y Exportación Excel ✅

Sesión del 1 de mayo de 2026.

### Lo que se logró hoy:

**ApprovalsScreen.jsx (archivo nuevo):**
- [x] Lista de hojas enviadas pendientes de aprobación
- [x] Badge rojo con conteo de hojas pendientes
- [x] Filtros: Pendientes / Aprobadas / Todas
- [x] Card por hoja con nombre del owner (brigada o PM), semana, fecha de envío y firma
- [x] Íconos diferenciados: 🏗 para brigadas, 👤 para PMs
- [x] Badge de status con colores (amarillo pendiente, verde aprobada)

**ApprovalDetailScreen.jsx (archivo nuevo):**
- [x] Detalle completo de la hoja con resumen igual al WeekSummaryScreen
- [x] Card de owner con nombre, semana y firma
- [x] Card azul con total de horas de la semana
- [x] Desglose por empleado con Regular / OT×1.5 / OT×2
- [x] Desglose por proyecto con conteo de empleados
- [x] Detalle por día con horario y proyecto
- [x] Botón ✅ Aprobar con confirmación
- [x] Botón ❌ Rechazar con comentario opcional
- [x] Al aprobar: status → approved, guarda approved_at, approved_by
- [x] Al rechazar: status → draft, guarda rejection_note, limpia firma
- [x] Banner de aprobación con fecha
- [x] Botón 📥 Excel para exportar

**exportToExcel.js (archivo nuevo en src/utils/):**
- [x] Librería xlsx instalada (npm install xlsx)
- [x] Hoja "Resumen": una fila por empleado con totales reg/OT×1.5/OT×2
- [x] Fila TOTAL al final del resumen
- [x] Hoja "Detalle": una fila por día por empleado con horario y proyecto
- [x] Encabezado con nombre de ETS Corporation, brigada/PM, semana y estado
- [x] Nombre de archivo automático: ETS_Horas_[Owner]_[fecha].xlsx
- [x] Anchos de columna configurados para legibilidad

**HomeScreen.jsx (actualizado):**
- [x] Approvers ven ApprovalsScreen en tab "Aprobaciones"

**Base de datos:**
- [x] Columna rejection_note añadida a weekly_sheets

**Verificado en Vercel:** ✅ Todo funcionando en producción

### Archivos del proyecto al cierre de la sesión:
- src/components/ApprovalsScreen.jsx — lista de hojas (nuevo)
- src/components/ApprovalDetailScreen.jsx — detalle + aprobar/rechazar (nuevo)
- src/utils/exportToExcel.js — exportación a Excel (nuevo)
- src/components/HomeScreen.jsx — actualizado con ApprovalsScreen
- src/components/WeekSummaryScreen.jsx
- src/components/BrigadeWeekScreen.jsx
- src/components/PMWeekScreen.jsx
- src/components/DayEntryModal.jsx
- src/components/AdminScreen.jsx
- src/components/BrigadesView.jsx
- src/components/ProjectsView.jsx
- src/components/LoginScreen.jsx
- src/components/PinScreen.jsx
- src/components/MyAccountScreen.jsx
- src/components/ChangePinScreen.jsx
- src/components/MainLayout.jsx

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas              100% ✅
- Fase 4: Firma y Aprobación            100% ✅
- Fase 5: Reportes y Offline              0% ⏳
- Fase 6: Piloto y Lanzamiento            0% ⏳

### Pendientes Fase 5 (próxima sesión):
- [ ] Dashboard con gráficas de horas por proyecto
- [ ] Ranking de empleados por horas
- [ ] Evolución semanal de OT
- [ ] Capacidad offline con sincronización

## Fase 5 - Sesión 1: Dashboard de Reportes y Reset de PIN ✅

Sesión del 4 de mayo de 2026.

### Lo que se logró hoy:

**ReportsView.jsx (archivo nuevo):**
- [x] Dashboard accesible desde Admin → Reportes
- [x] Librería recharts instalada (npm install recharts)
- [x] 4 tarjetas resumen: Total horas, Total OT, Pendientes, Aprobadas
- [x] Gráfica de barras horizontales: Horas por Proyecto (azul)
- [x] Gráfica de barras horizontales: Horas por Empleado (verde)
- [x] Gráfica de líneas: Evolución de horas por semana (Regular / OT×1.5 / OT×2)
- [x] Período por defecto: últimas 4 semanas
- [x] Tooltip personalizado en todas las gráficas
- [x] Verificado en Vercel y en iPhone ✅

**ResetPinView.jsx (archivo nuevo):**
- [x] Pantalla dedicada de Reset de PIN desde Admin
- [x] Lista separada: Con acceso a la app / Sin acceso
- [x] Indicador de estado de PIN: "PIN personalizado" (verde) o "PIN = 0000" (amarillo)
- [x] Búsqueda de empleados en tiempo real
- [x] Botón Resetear con confirmación inline (Sí / No)
- [x] Toast de confirmación al resetear

**AdminScreen.jsx (actualizado):**
- [x] Reset de PIN conectado a ResetPinView (ya no dice "Próximamente")
- [x] Todas las 5 herramientas del Admin funcionando al 100%

### Estado del proyecto:
- Fase 1: Setup e Infraestructura       100% ✅
- Fase 2: Auth y Catálogos              100% ✅
- Fase 3: Captura de Horas              100% ✅
- Fase 4: Firma y Aprobación            100% ✅
- Fase 5: Reportes                      100% ✅
- Fase 6: Piloto y Lanzamiento            0% ⏳

### Archivos del proyecto al cierre de la sesión:
- src/components/ReportsView.jsx — dashboard de reportes (nuevo)
- src/components/ResetPinView.jsx — reset de PIN dedicado (nuevo)
- src/components/AdminScreen.jsx — todas las herramientas conectadas
- src/components/ApprovalsScreen.jsx
- src/components/ApprovalDetailScreen.jsx
- src/components/WeekSummaryScreen.jsx
- src/components/BrigadeWeekScreen.jsx
- src/components/PMWeekScreen.jsx
- src/components/DayEntryModal.jsx
- src/components/BrigadesView.jsx
- src/components/ProjectsView.jsx
- src/components/HomeScreen.jsx
- src/components/LoginScreen.jsx
- src/components/PinScreen.jsx
- src/components/MyAccountScreen.jsx
- src/components/ChangePinScreen.jsx
- src/components/MainLayout.jsx
- src/utils/exportToExcel.js

### Pendientes Fase 6 (próxima sesión):
- [ ] Definir brigada piloto y semana de inicio
- [ ] Capacitación del equipo (supervisores, PMs, aprobadores)
- [ ] Prueba con datos reales durante 1 semana
- [ ] Recopilar feedback y ajustes finales
- [ ] Go-live oficial con todas las brigadas

Cuando empiece la Fase 2, usar este mensaje:

> "Hola Claude. Retomo ETS Time Tracker. Ya completé la Fase 1 (setup, GitHub, Vercel, app corriendo). Ahora voy a empezar Fase 2: autenticación con PIN y catálogos. Por favor lee PROGRESO.md del proyecto para el contexto completo."