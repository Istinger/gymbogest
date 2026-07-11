-- Catálogo de paquetes (gestionado por la Propietaria) y configuración
-- de la prueba gratis por registro (3 días por defecto, editable).
CREATE TABLE "PaqueteCatalogo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clasesPorSemana" INTEGER NOT NULL,
    "saldoClases" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaqueteCatalogo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaqueteCatalogo_nombre_key" ON "PaqueteCatalogo"("nombre");

CREATE TABLE "ConfiguracionPrueba" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "diasPrueba" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "ConfiguracionPrueba_pkey" PRIMARY KEY ("id")
);

-- Fila única de configuración: prueba gratis habilitada, 3 días por defecto
INSERT INTO "ConfiguracionPrueba" ("id", "habilitado", "diasPrueba") VALUES (1, true, 3);
