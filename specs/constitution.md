# Constitución del Proyecto GymboGest

Principios innegociables. Toda tarea, commit y decisión de diseño debe respetarlos.

## I. Trazabilidad UML ↔ Código (NO NEGOCIABLE)
Los modelos de datos usan EXACTAMENTE los nombres del diagrama de clases del Avance 6:
`Persona, Tutor, Empleado, Familia, Nino, Paquete, Reserva, Clase, Asistencia, MaterialDidactico`.
Si el código necesita divergir del diagrama, primero se actualiza el diagrama, luego el código.

## II. Reglas de negocio en el backend
Las validaciones críticas viven en el servidor, nunca solo en la interfaz:
- Cupo máximo de 9 niños por clase (RF-02). Se valida dentro de una transacción.
- El paquete debe tener saldo para reservar (CU-02, excepción paso 4).
- No se duplican familias: la cédula del tutor es única (CU-01, excepción paso 6).

## III. Semántica de relaciones del diagrama de clases
- Composición ⇒ borrado en cascada: Familia◆Nino, Paquete◆Reserva (`onDelete: Cascade`).
- Agregación ⇒ las partes sobreviven: Clase◇MaterialDidactico (tabla intermedia, sin cascada).
- Herencia Persona→Tutor/Empleado ⇒ tabla padre + relaciones 1:1 (table-per-type).

## IV. Protección de datos (RNF-01, LOPDP Ecuador)
- Contraseñas con bcrypt, nunca en texto plano.
- Autenticación JWT con roles: PROPIETARIA, RECEPCION, EDUCADORA, TUTOR.
- Los datos de menores solo son visibles para roles autorizados.

## V. Cada endpoint referencia su requerimiento
Todo route handler lleva un comentario `// RF-XX / CU-XX` que lo vincula al documento.

## VI. Alcance disciplinado
Solo se implementa lo especificado en spec.md. Las ideas nuevas van a `specs/backlog.md`,
no al código. La fecha de defensa (3 de agosto) manda.
