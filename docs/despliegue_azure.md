# Guía de despliegue en Microsoft Azure

Coincide con el diagrama de despliegue del Avance 6 (Servidor de Aplicaciones en
contenedor Docker + Servidor de BD PostgreSQL en Azure).

## 1. Base de datos — Azure Database for PostgreSQL Flexible Server
```bash
az postgres flexible-server create \
  --resource-group rg-gymbogest \
  --name gymbogest-db \
  --admin-user gymbo \
  --admin-password <clave-segura> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16

az postgres flexible-server db create \
  --resource-group rg-gymbogest \
  --server-name gymbogest-db \
  --database-name gymbogest
```
Copiar la cadena de conexión (incluye `sslmode=require`, ya viene forzado) a
`DATABASE_URL` — es el mismo enlace "TCP 5432 (SSL)" del diagrama de despliegue.

## 2. Backend — Azure Container Apps (recomendado: escala a 0, más barato)
```bash
az acr create --resource-group rg-gymbogest --name acrgymbogest --sku Basic
az acr build --registry acrgymbogest --image gymbogest-backend:latest ./backend -f backend/Dockerfile.prod

az containerapp env create --name env-gymbogest --resource-group rg-gymbogest

az containerapp create \
  --name gymbogest-api \
  --resource-group rg-gymbogest \
  --environment env-gymbogest \
  --image acrgymbogest.azurecr.io/gymbogest-backend:latest \
  --target-port 3001 --ingress external \
  --env-vars DATABASE_URL=secretref:db-url JWT_SECRET=secretref:jwt-secret \
  --secrets db-url="<cadena-de-conexion>" jwt-secret="<clave-segura>"
```

## 3. Migraciones en producción
```bash
DATABASE_URL="<cadena-de-conexion>" npx prisma migrate deploy   # NO usar migrate dev
psql "<cadena-de-conexion>" -f database/triggers_auditoria.sql
```

## 4. Frontend — Azure Static Web Apps (gratis, ideal para React/Vite)
```bash
az staticwebapp create --name gymbogest-web --resource-group rg-gymbogest \
  --source ./frontend --location "East US 2" --branch main
```

## Checklist antes de la defensa
- [ ] `DATABASE_URL` apunta a Azure, no a localhost.
- [ ] Backup previo: `./scripts/backup.sh` o el respaldo automático de Azure
      (Flexible Server lo hace diario por defecto, 7 días de retención).
- [ ] Probar `/api/salud` desde la URL pública antes de la exposición.
- [ ] Tener el plan B: si Azure falla el día de la defensa, levantar
      `docker compose --profile full up -d` localmente (mismo Dockerfile de dev).
