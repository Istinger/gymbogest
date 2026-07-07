#!/usr/bin/env bash
# Respaldo de GymboGest — Durabilidad ACID + recuperación ante desastres.
# (Nota: esto NO es teorema CAP; CAP aplica a sistemas distribuidos multi-nodo.)
# Uso: ./scripts/backup.sh   |  Restaurar: psql -U gymbo gymbogest < archivo.sql
set -e
FECHA=$(date +%Y%m%d_%H%M)
DIR="database/backups"; mkdir -p "$DIR"
PGPASSWORD=gymbo123 pg_dump -h localhost -U gymbo gymbogest > "$DIR/gymbogest_$FECHA.sql"
# conservar los últimos 7 respaldos
ls -t "$DIR"/gymbogest_*.sql | tail -n +8 | xargs -r rm
echo "Respaldo creado: $DIR/gymbogest_$FECHA.sql"
# Automatizar (cada noche 2am):  crontab -e →  0 2 * * * /ruta/scripts/backup.sh
