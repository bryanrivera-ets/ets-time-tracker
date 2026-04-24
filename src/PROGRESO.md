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

Cuando empiece la Fase 2, usar este mensaje:

> "Hola Claude. Retomo ETS Time Tracker. Ya completé la Fase 1 (setup, GitHub, Vercel, app corriendo). Ahora voy a empezar Fase 2: autenticación con PIN y catálogos. Por favor lee PROGRESO.md del proyecto para el contexto completo."