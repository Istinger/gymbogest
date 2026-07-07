# GymboGest

Sistema web de gestión para **Gymboree Play & Music — Sede Los Chillos** (estimulación
temprana, niños 0–6 años). Proyecto final de Análisis y Diseño de Sistemas, UPS, Periodo 68.

## Qué resuelve
- Agendamiento de clases con control de cupo (máx. 9 niños) y reservas en línea para padres.
- Inscripciones con registro del canal de origen (mide la estrategia MAX-MAX del negocio).
- Asistencia, seguimiento del desarrollo, inventario de material didáctico.
- Tablero de indicadores reales para la propietaria y gestión de servicios corporativos (On The Go).

## Stack (PERN)
React · Node/Express · **PostgreSQL + Prisma**. Desarrollo guiado por especificación
(*Spec-Driven Development*): ver `specs/`.

## Trazabilidad
`backend/prisma/schema.prisma` implementa 1:1 el **diagrama de clases** del proyecto
(Persona→Tutor/Empleado por herencia, composiciones Familia◆Nino y Paquete◆Reserva,
agregación Clase◇MaterialDidactico). Cada endpoint referencia su requerimiento (RF-XX).
Ver `database/modelo_er.png` para el diagrama entidad-relación completo.

## Instalación

Este proyecto tiene **dos servicios**: la base de datos PostgreSQL y la API backend
(Node/Express). Docker Compose siempre levanta la base de datos; el backend puedes
correrlo en tu propia máquina (necesitas Node.js instalado) o también en Docker.

### Paso 0 — Configurar variables de entorno (una sola vez)
Las claves NUNCA van escritas directo en `docker-compose.yml` ni en el código;
se leen de un archivo `.env` que no se sube a git (ver `.gitignore`).
```bash
cp .env.example .env            # completar POSTGRES_PASSWORD y JWT_SECRET con valores reales
cp backend/.env.example backend/.env   # usar los MISMOS valores que en el .env de la raíz
```

### Opción A — Desarrollo normal (recomendada)
Requiere tener [Node.js](https://nodejs.org) instalado (trae `npm` incluido).
```bash
docker compose up -d db        # solo la base de datos, en segundo plano
cd backend
npm install                    # descarga las dependencias listadas en package.json
npx prisma migrate dev         # crea las tablas desde schema.prisma
npm run seed                   # datos de ejemplo
npm run dev                    # API en http://localhost:3001 (hot-reload)
```

### Opción B — Todo en Docker (sin instalar Node.js)
```bash
docker compose --profile full up -d --build
docker compose exec backend npx prisma migrate dev
docker compose exec backend npm run seed
# API en http://localhost:3001
```

### Verificar que funciona
```bash
curl http://localhost:3001/api/salud
# → {"ok":true,"sistema":"GymboGest"}
```

## Pruebas

### Unitarias (no requieren base de datos — usan un Prisma falso inyectado)
```bash
docker compose exec backend npm test
```

### Integración (requieren una BD de prueba aparte, para no tocar tus datos reales)
```bash
# 1. Crear la BD de prueba (una sola vez)
docker compose exec db createdb -U gymbo gymbogest_test

# 2. Migrar y sembrar ESA base (nota el -e para apuntar a gymbogest_test)
docker compose exec -e DATABASE_URL="postgresql://gymbo:TU_PASSWORD@db:5432/gymbogest_test" \
  backend npx prisma migrate deploy
docker compose exec -e DATABASE_URL="postgresql://gymbo:TU_PASSWORD@db:5432/gymbogest_test" \
  backend npm run seed

# 3. Ejecutar las pruebas de integración contra esa base
docker compose exec -e DATABASE_URL="postgresql://gymbo:TU_PASSWORD@db:5432/gymbogest_test" \
  backend npm run test:integration
```
Reemplaza `TU_PASSWORD` por el valor real de `POSTGRES_PASSWORD` en tu `.env`.
Prueban: login válido/inválido, autorización por rol (401/403/200) y el rechazo
del cupo lleno de extremo a extremo (HTTP real, no simulado).

## Auditoría
Después de migrar (`npx prisma migrate dev` o `migrate deploy`), aplicar los triggers
de auditoría (RNF-07) **una sola vez** por base de datos:
```bash
docker compose exec -T db psql -U gymbo -d gymbogest < database/triggers_auditoria.sql
```
No están dentro de las migraciones de Prisma a propósito: Prisma no gestiona bien
funciones/triggers PL/pgSQL puros en su sistema de migraciones versionadas.
Verificar que quedaron activos:
```bash
docker compose exec db psql -U gymbo -d gymbogest -c \
  "SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_auditoria%';"   # deben salir 8 filas
```

## Respaldo de base de datos
```bash
./scripts/backup.sh     # genera database/backups/gymbogest_<fecha>.sql
```
Requisito de la rúbrica: `database/respaldo_gymbogest.sql` debe existir en el repo final.

## Despliegue en la nube
Ver `docs/despliegue_azure.md` — coincide con el diagrama de despliegue del Avance 6
(Azure Container Apps + Azure Database for PostgreSQL). `backend/Dockerfile.prod` es
la imagen lista para producción (multi-stage, sin devDependencies, usuario no-root).

## Estructura
```
specs/          especificación, plan y tareas (SDD)
backend/        API Express + Prisma (Dockerfile dev + Dockerfile.prod)
frontend/       React (Vite)
database/       respaldo SQL, triggers de auditoría, modelo ER
scripts/        backup.sh
docs/           guía de despliegue en Azure
```
