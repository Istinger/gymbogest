# Plan técnico — GymboGest

Fuente: RNF del Avance 4 y diagrama de despliegue del Avance 6.

## Stack (PERN)
| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React 18 + Vite + React Router | RNF-05 (web responsiva) |
| Backend | Node.js 20 + Express | API REST del diagrama de despliegue |
| ORM | Prisma | schema.prisma = diagrama de clases (trazabilidad 1:1) |
| BD | PostgreSQL 16 | Integridad referencial y transacciones (cupo ≤ 9) |
| Auth | JWT + bcrypt | RNF-01, roles LOPDP |
| Infra | Docker Compose (dev) · BD cloud (Azure/Neon) en producción | Diagrama de despliegue |

## Arquitectura backend (en capas — RNF-06)
```
backend/src/
  routes/      → endpoints HTTP (uno por módulo, comentados con RF-XX)
  services/    → reglas de negocio (aquí vive la transacción de reserva)
  middleware/  → auth JWT, verificación de rol
  prisma/      → cliente de BD
```

## Decisiones clave
1. **Herencia Persona→Tutor/Empleado**: table-per-type (Persona + relaciones 1:1),
   refleja el diagrama de clases literalmente.
2. **Composición** = `onDelete: Cascade` (Familia→Nino, Paquete→Reserva).
   **Agregación** = tabla intermedia ClaseMaterial sin cascada.
3. **Cupo ≤ 9**: se valida DENTRO de `prisma.$transaction` contando reservas activas
   con la clase bloqueada, para resistir concurrencia.
4. **Dátil**: mock interno que devuelve `{ numeroComprobante }`; en el despliegue se
   documenta como integración futura por API REST.
5. **Respaldo BD para GitHub**: `pg_dump gymbogest > database/respaldo_gymbogest.sql`
   (estructura + datos semilla) — exigido por la rúbrica.

## Entornos
- Desarrollo: `docker compose up` levanta postgres:16 + backend con hot-reload.
- Producción/defensa: BD en la nube; el diagrama de despliegue del Avance 6 ya lo refleja.
