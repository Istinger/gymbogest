-- RF-08: On The Go atiende empresas y particulares (clases privadas)
CREATE TYPE "TipoEvento" AS ENUM ('EMPRESA', 'PARTICULAR');

ALTER TABLE "EventoCorporativo" ADD COLUMN "tipo" "TipoEvento" NOT NULL DEFAULT 'EMPRESA';
