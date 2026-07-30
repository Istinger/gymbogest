# Especificación — GymboGest (v1.1)

Sistema web de gestión para Gymboree Play & Music Los Chillos.
Fuente: Avance 4 (requerimientos) y Avance 5 (casos de uso) del proyecto de Análisis y Diseño de Sistemas, UPS.

## Usuarios y roles (RNF-01)
- **ADMIN**: administración de cuentas (crear/editar correos, nombres, contraseñas y roles
  operativos) y bitácora de ingresos al sistema. Los roles ADMIN y PROPIETARIA están
  PROTEGIDOS: no pueden asignarse ni cambiarse desde la gestión de cuentas (403).
- **PROPIETARIA**: indicadores y reportes (incl. exportación a Excel), programación de
  clases con calendario de educadoras, seguimiento de faltas, servicios corporativos.
- **RECEPCION**: inscripciones, agenda del día, asignación de clases a niños, inventario.
- **EDUCADORA**: SOLO sus clases asignadas (autorización a nivel de dato), asistencia,
  progreso. Puede consultar el panel de Recepción.
- **TUTOR** (padre): reserva/reagenda/cancela en línea, ve el progreso de sus hijos (LOPDP).
  El sign up público crea cuentas con rol TUTOR por defecto; si el correo coincide con una
  Persona ya inscrita, la cuenta queda vinculada a su familia.
- Todo intento de login (exitoso o fallido) queda registrado en la bitácora de accesos
  (LogAcceso: fecha, correo, resultado, IP), visible solo para ADMIN.

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
- [ ] **Rango de edad del niño (0–6 años).** El centro atiende estimulación temprana de 0 a 6 años,
      por lo que `fechaNacimiento` se valida así:
  - [ ] Rechaza fechas **futuras** (un niño no puede nacer mañana) → 400.
  - [ ] Rechaza niños que ya **cumplieron 7 años** → 400. Un niño de 6 años SÍ es elegible
        (la edad válida es 0–6 años cumplidos; la elegibilidad termina en el 7º cumpleaños).
  - [ ] La misma regla aplica al **corregir** la fecha en la extensión CU-01 (si no, el rango
        se podría evadir editando después del registro).
  - [ ] El mensaje de error indica la edad calculada y el rango permitido.

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

#### Extensión RF-01/RF-03 · Catálogo de paquetes y prueba gratis
Como PROPIETARIA quiero gestionar el catálogo de paquetes del centro y la prueba gratis por registro.
**Aceptación:**
- [ ] La PROPIETARIA crea, edita, desactiva/reactiva y elimina paquetes del catálogo (nombre único, clasesPorSemana 1–7, clases incluidas ≥ 1, precio opcional ≥ 0).
- [ ] El catálogo es una plantilla comercial: eliminar/desactivar un ítem NO afecta a los paquetes ya contratados por familias (sin FK).
- [ ] Recepción solo ve los paquetes ACTIVOS.
- [ ] Prueba gratis configurable (habilitada/deshabilitada, 1–30 días; default: habilitada, 3 días).
- [ ] Toda familia NUEVA recibe automáticamente un paquete PRUEBA_GRATIS con 1 clase de prueba por día configurado; asociar un niño a una familia existente NO regala otra prueba.
- [ ] Cambios al catálogo y a la configuración quedan auditados (triggers + `app.usuario_id`).

#### Extensión RF-03 · Contratar y ajustar paquetes de una familia
Como RECEPCION quiero contratar un paquete del catálogo para una familia; como PROPIETARIA quiero corregir un paquete contratado.
**Aceptación:**
- [ ] RECEPCION y PROPIETARIA contratan un paquete eligiendo SOLO del catálogo activo: tipo, clasesPorSemana y saldo se COPIAN de la plantilla (Recepción no inventa valores).
- [ ] Contratar una plantilla inactiva o inexistente se rechaza con mensaje claro.
- [ ] El pago es OPCIONAL al contratar (puede cobrarse por fuera): si se marca, se registra un Pago con el precio del catálogo y comprobante Dátil en la MISMA transacción.
- [ ] RECEPCION VE los paquetes de cada familia (tipo, saldo, prueba) pero NO puede editarlos: el ajuste manual de saldo es SOLO de la PROPIETARIA (el saldo es dinero en especie; el sistema ya lo mueve solo al reservar/cancelar). Recepción recibe 403.
- [ ] El ajuste no permite saldo negativo y queda auditado (trigger sobre Paquete + `app.usuario_id`).

#### Extensión RF-03 · Vigencia de los paquetes (vencimiento en el tiempo)
Como PROPIETARIA quiero que los paquetes tengan una duración; como TUTOR no debo poder reservar con un paquete cuyo tiempo ya terminó.
**Aceptación:**
- [ ] Cada paquete del catálogo puede tener `duracionDias` (1–365, opcional: sin valor = no vence).
- [ ] Al contratar, el paquete de la familia recibe `fechaVencimiento` = hoy + duracionDias (null si la plantilla no vence).
- [ ] El paquete PRUEBA_GRATIS vence a los N días configurados desde el registro (ventana de calendario).
- [ ] Reservar con un paquete VENCIDO se RECHAZA (409) con mensaje claro y sugerencia de renovar, aunque tenga saldo.
- [ ] Un paquete sin `fechaVencimiento` (contratos antiguos o plantillas sin duración) nunca vence.
- [ ] Reagendar una reserva ya pagada SÍ se permite aunque el paquete haya vencido (la clase ya fue descontada; solo cambia de horario).
- [ ] El portal del Tutor muestra la fecha de vencimiento de cada paquete y deshabilita los vencidos en el selector.

### HF-2 · Programar clases (RF-02)
Como RECEPCION o PROPIETARIA quiero crear clases por programa, día y hora, asignando la
educadora que la imparte, con cupo máximo 9.
**Aceptación:**
- [ ] Programa ∈ {PLAY_LEARN, MUSIC, ART, SCHOOL_SKILLS, PLAYLAB}.
- [ ] cupoMaximo por defecto = 9, no editable por encima de 9.
- [ ] La PROPIETARIA reprograma día/hora y reasigna la educadora de una clase existente.
- [ ] Calendario mensual por educadora (color por educadora) y exportación a Excel de las
      clases programadas, con filtros por programa, fecha, educadora y cupo.

### HF-3 · Reservar clase (RF-02, RF-03, CU-02) ⭐ CRÍTICA
Como TUTOR quiero reservar una clase para mi hijo según mi paquete.
**Aceptación:**
- [ ] La reserva N.º 10 en una clase es RECHAZADA con mensaje claro (transacción).
- [ ] Dos reservas simultáneas al último cupo: solo una gana (probar con transacción serializable).
- [ ] Descuenta 1 del saldoClases del paquete; si saldo = 0 → rechaza y sugiere renovar.
- [ ] Reagendar libera el cupo anterior y toma el nuevo, sin doble descuento.
- [ ] Cancelar devuelve el saldo al paquete y libera el cupo.
- [ ] Un niño no puede reservar dos veces la misma clase (@@unique ninoId+claseId) → 409 con
      mensaje claro, nunca el error crudo de BD.
- [ ] CHOQUE DE HORARIOS: un niño no puede tener dos clases ACTIVAS a la misma hora → 409;
      aplica también al reagendar (sin contar la reserva que se está moviendo).
- [ ] Las confirmaciones y rechazos se muestran como notificaciones en pantalla (RF-03).

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
- [ ] Seguimiento de faltas (día/semana/mes): niños que FALTARON con el contacto del tutor
      a cargo (teléfono, correo), exportable a Excel para dar seguimiento por canal externo.

### HF-8 · Servicios On The Go: corporativos y particulares (RF-08)
Como PROPIETARIA quiero registrar y editar solicitudes On The Go de empresas
y de particulares (familias que contratan una clase privada).
**Aceptación:** solicitud con tipo (EMPRESA | PARTICULAR), empresa/solicitante, contacto,
fecha y n.º de niños; asignación de educadora (pasa a CONFIRMADO); asignación de
materiales del inventario (con cantidad); ciclo de estados
SOLICITADO → CONFIRMADO → EJECUTADO/CANCELADO; edición de los datos en cualquier
estado (la Propietaria puede corregir incluso eventos ejecutados/cancelados);
búsqueda por texto y filtros por tipo y estado en el listado.
**Excepciones:** tipo fuera del catálogo → 400; evento inexistente → 404; los errores
inesperados nunca muestran el detalle técnico al usuario final.

## Fuera de alcance (backlog)
Notificaciones WhatsApp/correo automáticas, pagos en línea, integración real con Dátil
(se simula con un mock que genera un número de comprobante), asignación de MATERIALES a
eventos corporativos (RF-08: hoy solo se asigna fecha y educadora), indicador de
antigüedad de inscripción por niño, despliegue en cloud (RNF-04: corre contenerizado
en Docker, listo para desplegar).
