-- Extensión RF-03: vigencia de los paquetes.
-- Un paquete contratado puede vencer en el tiempo (fechaVencimiento);
-- la plantilla del catálogo define la duración en días al contratar.
-- NULL = no vence (contratos antiguos conservan su comportamiento).
ALTER TABLE "Paquete" ADD COLUMN "fechaVencimiento" TIMESTAMP(3);
ALTER TABLE "PaqueteCatalogo" ADD COLUMN "duracionDias" INTEGER;
