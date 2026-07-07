// ============================================================
// PRUEBA DE INTEGRACIÓN — API completa (RNF-01 + HF-3)
// A diferencia de la unitaria, esta prueba levanta la app Express
// real y golpea los endpoints por HTTP con Supertest, contra una
// BD DE PRUEBA independiente (gymbogest_test) ya migrada y sembrada.
//
// Preparación (ver README, sección "Pruebas de integración"):
//   docker compose exec db createdb -U gymbo gymbogest_test
//   docker compose exec -e DATABASE_URL=".../gymbogest_test" backend npx prisma migrate deploy
//   docker compose exec -e DATABASE_URL=".../gymbogest_test" backend npm run seed
// Ejecutar:
//   docker compose exec -e DATABASE_URL=".../gymbogest_test" backend npm run test:integration
//
// Usa las cuentas y IDs que crea prisma/seed.js (contraseña: semilla123).
// La clase id=1 queda sembrada con 9 reservas activas (llena).
// ============================================================
const request = require('supertest');
const app = require('../src/app');

describe('RNF-01: autenticación y autorización', () => {
  test('sin token → 401 en recurso protegido', async () => {
    const res = await request(app).get('/api/indicadores');
    expect(res.status).toBe(401);
  });

  test('login con credenciales inválidas → 401, mensaje genérico', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'noexiste@x.com', password: 'mala' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  test('login válido → devuelve token y rol', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'propietaria@gymbo.ec', password: 'semilla123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.rol).toBe('PROPIETARIA');
  });

  test('rol EDUCADORA no accede a /indicadores (solo PROPIETARIA) → 403', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'educadora1@gymbo.ec', password: 'semilla123' });
    const res = await request(app).get('/api/indicadores')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  test('rol PROPIETARIA sí accede a /indicadores → 200', async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'propietaria@gymbo.ec', password: 'semilla123' });
    const res = await request(app).get('/api/indicadores')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });
});

describe('HF-3: reserva de clase de extremo a extremo (CU-02)', () => {
  let token;
  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login')
      .send({ correo: 'recepcion@gymbo.ec', password: 'semilla123' });
    token = login.body.token;
  });

  test('reservar en la clase sembrada llena (id=1) responde 409 con sugerencia', async () => {
    const res = await request(app).post('/api/reservas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ninoId: 1, claseId: 1, paqueteId: 1 }); // clase 1: sembrada con 9/9
    expect(res.status).toBe(409);
    expect(res.body.sugerencia).toBe('horarios_alternativos');
  });

  test('sin token → 401 (no se puede reservar sin autenticarse)', async () => {
    const res = await request(app).post('/api/reservas')
      .send({ ninoId: 1, claseId: 2, paqueteId: 1 });
    expect(res.status).toBe(401);
  });
});
