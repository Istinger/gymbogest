# GymboGest

**Sistema web de gestión para Gymboree Play & Music — Sede Los Chillos**
Estimulación temprana para niños de 0 a 6 años · Quito, Ecuador

Proyecto final de *Análisis y Diseño de Sistemas* — Universidad Politécnica Salesiana, Periodo 68.


`React` · `Node/Express` · `PostgreSQL + Prisma` · `Docker` · `JWT`

---

## El problema

El centro gestionaba todo en cuadernos y hojas de cálculo sueltas. Eso provocaba tres
problemas que este sistema resuelve:

| Problema del negocio | Cómo lo resuelve GymboGest |
|---|---|
| Clases sobrevendidas: más de 9 niños en un aula pensada para 9 | Control de cupo **transaccional** (aislamiento `Serializable`): dos padres que reservan el último lugar a la vez nunca pasan los dos |
| No se sabía qué campaña traía clientes | Cada inscripción registra su **canal de captación** (redes, pediatra, referido…) y el panel lo grafica |
| La propietaria no tenía cifras para decidir | Tablero de **indicadores reales** calculados sobre la base de datos, no estimados |

Además cubre asistencia, seguimiento del desarrollo de cada niño, inventario de material
didáctico, paquetes de clases con vencimiento y los servicios corporativos *On The Go*.

## Qué hace cada rol

El acceso está segmentado por rol (RNF-01). Tras iniciar sesión, cada usuario aterriza
en su propio panel y solo ve lo que le corresponde.

| Rol | Panel | Puede hacer |
|---|---|---|
| **TUTOR** (padre/madre) | `/panel/tutor` | Reservar, reagendar y cancelar clases en línea; ver el progreso **solo de sus hijos** |
| **RECEPCION** | `/panel/recepcion` | Inscribir familias, agenda del día con cupo `X / 9`, asignar clases, inventario |
| **EDUCADORA** | `/panel/educadora` | Lista de **sus** clases asignadas, registrar asistencia y progreso |
| **PROPIETARIA** | `/panel/propietaria` | Indicadores, programación de clases, catálogo de paquetes, corporativos On The Go |
| **ADMIN** | `/panel/admin` | Cuentas de usuario y bitácora de ingresos |

El registro público crea **siempre** un TUTOR; los roles ADMIN y PROPIETARIA están
protegidos y no pueden asignarse desde la gestión de cuentas.


## Arquitectura

```
Navegador ──▶ React (Vite, :5173) ──▶ API Express (:3001) ──▶ PostgreSQL (:5432)
                                            │                      │
                                       JWT + roles           triggers de auditoría
```

**20 modelos** Prisma · **50 endpoints** repartidos en 14 módulos de rutas 

---

## Puesta en marcha

### Paso 0 — Variables de entorno (una sola vez)

Las claves nunca van escritas en el código ni en `docker-compose.yml`.

```bash
cp .env.example .env                    # completar POSTGRES_PASSWORD y JWT_SECRET
cp backend/.env.example backend/.env    # los MISMOS valores que en el .env de la raíz
```

### Opción A — Todo en Docker (no necesitas instalar Node.js)

```bash
docker compose --profile full up -d --build
docker compose exec backend npm run seed
```

- Frontend → <http://localhost:5173>
- API → <http://localhost:3001>

El contenedor regenera el cliente Prisma y aplica las migraciones en cada arranque, así
que tras cambiar `schema.prisma` basta con crear la migración y reiniciar el backend.

### Opción B — Desarrollo con Node.js local

```bash
docker compose up -d db          # solo la base de datos
cd backend
npm install
npx prisma migrate dev           # crea las tablas desde schema.prisma
npm run seed                     # datos de ejemplo
npm run dev                      # API con hot-reload

cd ../frontend && npm install && npm run dev
```

### Verificar que funciona

```bash
curl http://localhost:3001/api/salud
# → {"ok":true,"sistema":"GymboGest"}
```

### Cuentas de ejemplo (tras `npm run seed`)

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@gymbo.ec` | `admin123` |
| Propietaria | `propietaria@gymbo.ec` | `semilla123` |
| Recepción | `recepcion@gymbo.ec` | `semilla123` |
| Educadora | `educadora1@gymbo.ec` · `educadora2@gymbo.ec` | `semilla123` |

## Respaldo

```bash
./scripts/backup.sh     # genera database/backups/gymbogest_<fecha>.sql
```

## Despliegue

`docs/despliegue-gymboree.md` documenta el despliegue en **VPS propio** detrás de Nginx
Proxy Manager, con PostgreSQL en Docker dentro del mismo servidor.
`backend/Dockerfile.prod` es la imagen de producción: multi-stage, sin devDependencies y
con usuario no-root. Ver también `docker-compose.prod.yml`.

## Estructura

```
backend/     API Express + Prisma (Dockerfile dev + Dockerfile.prod)
frontend/    React + Vite (8 páginas, 9 componentes)
database/    triggers de auditoría y respaldos
scripts/     backup.sh
```
