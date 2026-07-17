# Tareas — GymboGest (orden de ejecución)

Cada tarea referencia su historia (HF) y requerimiento (RF). Marcar al completar.

## Fase 0 — Cimientos
- [X] T01 · Levantar docker-compose (postgres) y conectar Prisma. `npx prisma migrate dev`
- [x] T02 · Semillas: 1 propietaria, 1 recepcionista, 2 educadoras, programas y 6 clases de ejemplo. (seed.js) — incluye 1 clase pre-llenada con 9 reservas para demostrar el rechazo del cupo n.º 10 en la defensa.
- [x] T03 · Auth: login JWT + bcrypt + middleware de roles. (RNF-01) — src/middleware/auth.js, src/routes/auth.js
- [x] T03b · Auditoría por TRIGGERS en tablas críticas. (RNF-07) — database/triggers_auditoria.sql. Aplicar UNA VEZ tras cada `migrate dev`/`migrate deploy`: `docker compose exec -T db psql -U gymbo -d gymbogest < database/triggers_auditoria.sql`
- [x] T03c · Pruebas unitarias del servicio de reservas (Jest). — tests/reservaService.test.js
- [ ] T03d · Pruebas de integración (Supertest + BD gymbogest_test). — tests/api.integration.test.js

## Fase 1 — Núcleo de inscripciones (HF-1)
- [x] T04 · POST /api/familias — crea Familia+Tutor(Persona)+Nino en transacción. (RF-01) — services/familiaService.js + routes/familias.js
- [x] T05 · Manejo de cédula duplicada → asociar niño a familia existente. (CU-01 exc. 6) — probado en tests/familiaService.test.js
- [x] T06 · GET /api/familias, GET /api/familias/:id (ficha completa).

## Fase 2 — Agendamiento (HF-2, HF-3) ⭐ el corazón
- [x] T07 · CRUD /api/clases con cupoMaximo=9. (RF-02) — services/claseService.js + routes/clases.js
- [x] T08 · POST /api/reservas con transacción: verifica cupo<9 + saldo paquete, descuenta. (RF-02/03)
- [x] T09 · PUT /api/reservas/:id/reagendar y /cancelar (libera cupo, devuelve saldo). (CU-02) — sin doble descuento del paquete al reagendar
- [x] T10 · GET /api/agenda?fecha= — agenda del día con ocupación X/9. (Recepción) — services/agendaService.js + routes/agenda.js
- [x] T11 · Prueba de aceptación: intentar reserva n.º 10 → 409 (probado). Concurrencia: pendiente de prueba de carga real (Fase 6).

## Fase 3 — Operación diaria (HF-4, HF-5, HF-6)
- [x] T12 · POST /api/asistencias (solo niños con reserva en la clase). (RF-04) — asistenciaService.js
- [x] T13 · POST/GET /api/progresos por niño; tutor solo ve a sus hijos (LOPDP). (RF-05) — progresoService.js
- [x] T14 · CRUD /api/materiales + movimientos + GET /api/materiales/alertas. (RF-06) — materialService.js

## Fase 4 — Valor gerencial (HF-7, HF-8)
- [x] T15 · GET /api/indicadores (activos, inscritos, por canal, conversión, asistencia por clase). (RF-07) — indicadorService.js
- [x] T16 · CRUD /api/corporativos (solicitudes On The Go). (RF-08) — corporativoService.js
- [x] T17 · Pagos: POST /api/pagos con mock Dátil → numeroComprobante. — pagoService.js (integración real en backlog.md)
- [x] T28 · On The Go ampliado: tipo EMPRESA|PARTICULAR (clases privadas de familias), PUT /api/corporativos/:id para editar en cualquier estado, filtros de búsqueda (texto/tipo/estado) y errores 500 sin detalle técnico al usuario. (RF-08) — pendiente reflejar TipoEvento en el diagrama de clases del Avance 6 (regla de oro)

## Fase 5 — Frontend React
- [x] T18 · Layout base: banner, menú, footer (según wireframes Avance 7). Login + redirección por rol.
- [x] T19 · Panel Recepción: inscripciones + agenda del día (wireframe 3).
- [x] T20 · Portal Tutor: reservar/reagendar/cancelar.
- [x] T21 · Panel Educadora: lista de clase, asistencia, progreso.
- [x] T22 · Panel Propietaria: tablero de indicadores + corporativos + gestión de cuentas (sign up público rol TUTOR; la Propietaria eleva roles y cambia correos/contraseñas/nombres).

## Fase 6 — Cierre para la defensa
- [ ] T23 · pg_dump → database/respaldo_gymbogest.sql (rúbrica). Automatizado: scripts/backup.sh (+cron)
- [ ] T24 · README con descripción, arquitectura e instalación (rúbrica).
- [ ] T25 · Capturas de pantalla → tabla 1.8.3 del Avance 7.
- [ ] T26 · Matriz de trazabilidad RF↔CU↔clase↔archivo↔pantalla (1 página para la defensa).
- [ ] T27 · Ensayo de defensa: demo de 9→rechazo del 10.º, mostrar schema.prisma vs diagrama de clases.