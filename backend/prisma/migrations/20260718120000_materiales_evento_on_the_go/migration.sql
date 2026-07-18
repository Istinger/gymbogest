-- RF-08: materiales del inventario asignados a un evento On The Go
CREATE TABLE "EventoMaterial" (
    "eventoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EventoMaterial_pkey" PRIMARY KEY ("eventoId","materialId")
);

ALTER TABLE "EventoMaterial" ADD CONSTRAINT "EventoMaterial_eventoId_fkey"
    FOREIGN KEY ("eventoId") REFERENCES "EventoCorporativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventoMaterial" ADD CONSTRAINT "EventoMaterial_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "MaterialDidactico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
