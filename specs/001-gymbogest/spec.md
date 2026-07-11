# Especificación — GymboGest (v1.0)

Sistema web de gestión para Gymboree Play & Music Los Chillos.
Fuente: Avance 4 (requerimientos) y Avance 5 (casos de uso) del proyecto de Análisis y Diseño de Sistemas, UPS.

## Usuarios y roles
- **PROPIETARIA**: indicadores, reportes, servicios corporativos, gestión de usuarios.
- **RECEPCION**: inscripciones, agenda, reservas, pagos, inventario.
- **EDUCADORA**: lista de clase, asistencia, progreso.
- **TUTOR** (padre): reserva/reagenda en línea, ve el progreso de su hijo.

## Historias funcionales (con criterio de aceptación verificable)

### HF-1 · Registrar familia (RF-01, CU-01)
Como RECEPCION o TUTOR quiero registrar a un niño con su tutor y el canal de origen.
**Aceptación:**
- [ ] Crea Familia + Nino + Tutor(Persona) en una sola operación.
- [ ] canalOrigen ∈ {REDES, PEDIATRA_ALIADO, EMPRESA, REFERIDO}.
- [ ] Si la cédula del tutor ya existe → ofrece asociar el niño a la familia existente (no duplica).
- [ ] Una familia no puede tener dos niños con el mismo nombre (comparación sin mayúsculas/tildes); aplica al asociar y al renombrar en la edición.
- [ ] Campos obligatorios validados; correo y cédula con formato correcto.
- [ ] El correo debe pertenecer a un proveedor conocido (gmail, hotmail, outlook, yahoo, icloud, proton) — mismo criterio que el sign up (RNF-01).
- [ ] La cédula se valida con el algoritmo ecuatoriano (provincia 01–24, tercer dígito 0–5, dígito verificador módulo 10).

#### Extensión CU-01 · Corregir datos de la inscripción (typos)
Como RECEPCION o PROPIETARIA quiero corregir datos mal tipeados del tutor o del niño.
**Aceptación:**
- [ ] RECEPCION y PROPIETARIA editan nombre, teléfono, correo, parentesco y datos del niño.
- [ ] La CÉDULA del tutor solo la corrige la PROPIETARIA (es la clave que deduplica familias, exc. 6); Recepción recibe 403.
- [ ] El correo/cédula corregidos pasan las mismas validaciones del registro.
- [ ] Toda edición queda auditada (trigger sobre Persona/Tutor/Nino con `app.usuario_id`).
- [ ] RECEPCION/PROPIETARIA pueden dar de baja a un niño (estado inactivo) y reactivarlo. La baja es SUAVE: conserva reservas, asistencias y progresos (LOPDP) — nunca se borra el registro.
- [ ] Un niño inactivo no puede recibir reservas nuevas (la API responde 409 con mensaje claro).
- [ ] Al dar de baja, sus reservas ACTIVAS de clases FUTURAS se cancelan devolviendo el saldo al paquete; las clases pasadas/en curso se conservan como historial. Las canceladas dejan de contar en el cupo y de mostrarse en la agenda del día.

### HF-2 · Programar clases (RF-02)
Como RECEPCION quiero crear clases por programa y horario con cupo máximo 9.
**Aceptación:**
- [ ] Programa ∈ {PLAY_LEARN, MUSIC, ART, SCHOOL_SKILLS, PLAYLAB}.
- [ ] cupoMaximo por defecto = 9, no editable por encima de 9.

### HF-3 · Reservar clase (RF-02, RF-03, CU-02) ⭐ CRÍTICA
Como TUTOR quiero reservar una clase para mi hijo según mi paquete.
**Aceptación:**
- [ ] La reserva N.º 10 en una clase es RECHAZADA con mensaje claro (transacción).
- [ ] Dos reservas simultáneas al último cupo: solo una gana (probar con transacción serializable).
- [ ] Descuenta 1 del saldoClases del paquete; si saldo = 0 → rechaza y sugiere renovar.
- [ ] Reagendar libera el cupo anterior y toma el nuevo, sin doble descuento.
- [ ] Cancelar devuelve el saldo al paquete y libera el cupo.

### HF-4 · Registrar asistencia (RF-04)
Como EDUCADORA quiero marcar asistencia por clase.
**Aceptación:** estado ∈ {ASISTIO, FALTO, CLASE_PRUEBA}; solo niños con reserva en esa clase.

### HF-5 · Registrar progreso (RF-05)
Como EDUCADORA quiero registrar observaciones del desarrollo del niño.
**Aceptación:** historial consultable por el TUTOR del niño (y solo el suyo).

### HF-6 · Inventario (RF-06)
Como RECEPCION quiero registrar entradas/salidas de material.
**Aceptación:** si stock < stockMinimo → el ítem aparece en alertas.

### HF-7 · Indicadores (RF-07, CU-03) ⭐ CRÍTICA
Como PROPIETARIA quiero el tablero con datos reales.
**Aceptación:**
- [ ] Niños activos, inscritos por semana/mes.
- [ ] Inscripciones por canal de origen (mide la estrategia MAX-MAX).
- [ ] Conversión: niños con CLASE_PRUEBA que no se inscribieron.
- [ ] Asistencia por clase. Filtro por rango de fechas.

### HF-8 · Servicios corporativos (RF-08)
Como PROPIETARIA quiero registrar solicitudes On The Go de empresas.
**Aceptación:** solicitud con empresa, fecha, n.º de niños; asignación de educadora; estado del evento.

## Fuera de alcance (backlog)
Notificaciones WhatsApp/correo automáticas, pagos en línea, integración real con Dátil
(se simula con un mock que genera un número de comprobante).
