# Backlog — ideas fuera del alcance v1

- **Auditoría avanzada**: panel de consulta de la tabla Auditoria para la PROPIETARIA
  (filtros por usuario/entidad/fecha), retención y exportación. La captura por
  triggers YA está implementada (database/triggers_auditoria.sql); esto es la UI.
- Notificaciones automáticas (correo/WhatsApp) de recordatorio de clase.
- Pagos en línea e integración real con Dátil (hoy: mock).
- Respaldo automático hacia almacenamiento en la nube (hoy: scripts/backup.sh local
  con cron; en producción usar los respaldos administrados de Azure PostgreSQL).
- Réplica de lectura de la BD (aquí SÍ entraría una discusión CAP/alta disponibilidad).
- Código de familia legible (ej. GYM-2026-0011) en vez del CUID crudo actual,
  para mostrarlo en pantalla o decirlo por teléfono a un padre.
- Limitación conocida: `@@unique([ninoId, claseId])` en Reserva impide que un niño
  vuelva a reservar la MISMA clase tras cancelarla (el registro viejo, aunque
  CANCELADA, sigue ocupando la combinación única). Solución futura: cambiar a un
  índice único parcial (WHERE estado = 'ACTIVA') o agregar un campo de versión.