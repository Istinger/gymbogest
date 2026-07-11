#!/bin/sh
# ============================================================
# Entrypoint de DESARROLLO del backend (no se usa en producción).
#
# Por qué existe: /app/node_modules es un volumen anónimo que
# sobrevive a `docker compose up --build`, así que el cliente
# Prisma generado en el build queda tapado por el del volumen.
# Este script hace que el contenedor SE AUTO-ACTUALICE al
# arrancar: nadie tiene que correr comandos de Prisma a mano.
# ============================================================
set -e

echo "→ [1/3] Regenerando cliente Prisma (sincroniza con schema.prisma)…"
npx prisma generate

echo "→ [2/3] Aplicando migraciones pendientes en la base de datos…"
npx prisma migrate deploy

echo "→ [3/3] Iniciando backend…"
exec npm run dev
