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
- **Asignación de MATERIALES a eventos corporativos** (RF-08): hoy el evento On The Go
  solo registra fecha y educadora; falta vincular material didáctico del inventario.
- **Indicador de antigüedad de inscripción por niño** (mencionado en el Avance 4 original;
  se retiró del RF-07 v2 por no estar implementado). Fácil: derivar de Familia.fechaRegistro.
- **Despliegue en cloud** (RNF-04): el sistema corre contenerizado con Docker en local;
  la arquitectura permite desplegarlo directo (Azure/AWS/Railway) pero aún no se hace.
- Exportación a .xlsx nativo (SheetJS) en vez de CSV con BOM (hoy Excel lo abre bien,
  pero el archivo no es un libro de Excel real).
- Limitación conocida: `@@unique([ninoId, claseId])` en Reserva impide que un niño
  vuelva a reservar la MISMA clase tras cancelarla (el registro viejo, aunque
  CANCELADA, sigue ocupando la combinación única). Solución futura: cambiar a un
  índice único parcial (WHERE estado = 'ACTIVA') o agregar un campo de versión.