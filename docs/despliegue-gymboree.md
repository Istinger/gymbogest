# Despliegue de GymboGest en el VPS

Guía de despliegue en **producción** sobre el VPS propio (no Azure), detrás de
**Nginx Proxy Manager (NPM)**, junto a otros proyectos que ya corren en la misma
máquina.

> Reemplaza al antiguo plan en Azure. La BD de producción es un **PostgreSQL en
> Docker** dentro del propio VPS (autocontenido), no una BD en la nube.

---

## Idea general

```
                       Internet
                          │  :80  :443
                          ▼
              ┌───────────────────────────┐
              │   Nginx Proxy Manager     │  enruta por DOMINIO
              │   HTTPS + Let's Encrypt   │
              └───────────┬───────────────┘
                          │  red Docker "proxy" (compartida)
                          ▼
                   ┌────────────┐
                   │  frontend  │  React (Vite) compilado + Nginx interno.
                   │            │  Sirve la SPA y reenvia /api al backend.
                   └─────┬──────┘
                         │   red "interna" (privada, invisible a internet)
                ┌────────┴────────┐
                ▼                 ▼
          ┌──────────┐      ┌──────────┐
          │ backend  │      │   db     │
          │ Node:3001│─────▶│ postgres │
          └──────────┘      └──────────┘
```

**Solo NPM publica puertos.** El frontend, el backend y la BD no exponen ninguno:
se hablan por redes internas de Docker.

---

## ¿Hay que cambiar puertos? NO

NPM ya ocupa los puertos públicos (80/443) y **enruta por dominio, no por
puerto**. Varios proyectos comparten la misma IP y los mismos 80/443; NPM mira el
nombre de dominio y manda cada petición al contenedor correcto.

Por eso el `docker-compose.prod.yml` de GymboGest **no publica ningún puerto**
(a diferencia del `docker-compose.yml` de desarrollo, que sí publica 5432/3001/
5173 para trabajar en local). Sin `ports:`, no hay choque posible con otros
proyectos, y la BD **no queda expuesta a internet** (publicar 5432 sería un
agujero: Docker se salta ufw).

---

## Archivos de producción (ya en el repo)

| Archivo | Para qué |
| --- | --- |
| `frontend/Dockerfile.prod` | Compila la SPA con Vite y la sirve con Nginx (no el server de dev) |
| `frontend/nginx-spa.conf` | Sirve la SPA + proxya `/api` → `backend:3001`; no cachea `index.html` |
| `docker-compose.prod.yml` | Orquesta db + backend + frontend, sin publicar puertos, en la red `proxy` |
| `backend/Dockerfile.prod` | Imagen de producción del backend (Node, no root, solo deps de prod) |

El de desarrollo (`docker-compose.yml`, `frontend/Dockerfile`) se queda para
trabajar en tu PC. No se usa en el VPS.

---

## Requisito previo del VPS (una sola vez)

La red compartida con NPM debe existir. Si ya desplegaste otro proyecto detrás de
NPM, ya está creada; si no:

```bash
docker network create proxy
```

---

## Paso 1 — Subdominio

En DuckDNS, crea `gymbogest` (→ `gymbogest.duckdns.org`) apuntando a la **misma
IP del VPS**. Verifica:

```bash
dig +short gymbogest.duckdns.org      # debe dar la IP del VPS
```

---

## Paso 2 — Clonar y configurar

```bash
cd ~
git clone https://github.com/Istinger/gymbogest.git
cd gymbogest
cp .env.example .env
nano .env
```

Valores mínimos en `.env` (los de puertos NO se usan en producción, se ignoran):

```env
POSTGRES_USER=gymbo
POSTGRES_PASSWORD=<genera: openssl rand -hex 24>
POSTGRES_DB=gymbogest
JWT_SECRET=<genera: openssl rand -hex 32>
```

> El `.env` nunca se sube a git (está en `.gitignore`). Genera los secretos en el
> propio VPS, no reutilices los de tu PC.

---

## Paso 3 — Levantar, migrar

```bash
# OJO: se usa el compose de PRODUCCION, no el de desarrollo
docker compose -f docker-compose.prod.yml up -d --build

# crea las tablas en la BD (el Dockerfile.prod no las corre solo)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

> ⚠️ **NO corras el seed en producción.** `prisma/seed.js` crea cuentas con
> contraseñas de demo conocidas (`admin123`, `semilla123`), visibles en el repo.
> Solo aplica migraciones (tablas vacías) y crea el admin real con una contraseña
> propia.

Comprobar que arrancó:

```bash
docker compose -f docker-compose.prod.yml ps        # db (healthy), backend, frontend Up
```

---

## Paso 4 — Proxy Host en NPM

Panel `:81` → **Hosts → Proxy Hosts → Add Proxy Host**:

| Campo | Valor |
| --- | --- |
| Domain Names | `gymbogest.duckdns.org` |
| Scheme | `http` |
| Forward Hostname | `gymbogest-frontend` (el `container_name`) |
| Forward Port | `80` |
| Block Common Exploits · Websockets Support | ✔ |

No se configura `/api`: el Nginx interno del frontend ya lo reenvía a
`backend:3001`.

---

## Paso 5 — HTTPS

En el Proxy Host → pestaña **SSL** → *Request a new SSL Certificate* → activar
**Force SSL** y **HTTP/2** → aceptar términos → **Save**. Let's Encrypt valida
por el puerto 80 y emite el certificado en segundos.

```bash
curl -I https://gymbogest.duckdns.org       # HTTP/2 200
```

---

## Actualizar tras un cambio

```bash
cd ~/gymbogest
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy  # si hubo migraciones
```

Gracias a que el `index.html` se sirve con `no-cache`, el navegador ve los
cambios sin tener que limpiar la caché.

---

## Problemas comunes

| Síntoma | Causa probable | Cómo mirar |
| --- | --- | --- |
| **502 Bad Gateway** | El frontend no está arriba o el Proxy Host apunta mal | `docker compose -f docker-compose.prod.yml ps` · Forward = `gymbogest-frontend` |
| NPM no resuelve `gymbogest-frontend` | No comparten la red `proxy` | `docker network inspect proxy` (deben salir NPM y gymbogest-frontend) |
| `port is already allocated` | Alguien publica un puerto ya usado | El compose de prod NO debe tener `ports:` |
| Backend 500 / no conecta a la BD | `.env` mal o migraciones sin aplicar | revisa `.env`, corre `prisma migrate deploy` |
| Certificado SSL falla | El subdominio no apunta al VPS | `dig +short gymbogest.duckdns.org` |

---

## Alternativa: BD en la nube

Si en el futuro quisieras la BD fuera del VPS: borra el servicio `db` del
`docker-compose.prod.yml`, quita `depends_on: db` del backend y pon la
`DATABASE_URL` de la nube directamente en el `.env`. El resto no cambia.

---

*Producción tras el despliegue: https://gymbogest.duckdns.org*
