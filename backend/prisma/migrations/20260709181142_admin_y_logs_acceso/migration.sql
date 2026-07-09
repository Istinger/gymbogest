-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'ADMIN';

-- CreateTable
CREATE TABLE "LogAcceso" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correo" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "ip" TEXT,

    CONSTRAINT "LogAcceso_pkey" PRIMARY KEY ("id")
);
