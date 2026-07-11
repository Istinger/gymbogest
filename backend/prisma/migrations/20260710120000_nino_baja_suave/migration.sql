-- Extensión CU-01: baja suave de niños.
-- Un niño inactivo conserva su historial (reservas, asistencias, progresos)
-- pero no puede recibir reservas nuevas.
ALTER TABLE "Nino" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
