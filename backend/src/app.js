// App Express separada del listen() para poder probarla con Supertest
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const { verificarToken, permitirRoles } = require('./middleware/auth');

app.use('/api/auth', require('./routes/auth'));       // RNF-01
app.use('/api/familias', require('./routes/familias')); // RF-01 (Fase 1)
app.use('/api/reservas', require('./routes/reservas')); // RF-02/03

// Stub temporal de RF-07 (se implementa completo en Fase 4 / T15).
// Ya sirve para probar la AUTORIZACIÓN por rol (RNF-01).
app.get('/api/indicadores', verificarToken, permitirRoles('PROPIETARIA'), (_req, res) => {
  res.json({ pendiente: 'Implementación completa en Fase 4 (T15)' });
});

app.get('/api/salud', (_req, res) => res.json({ ok: true, sistema: 'GymboGest' }));
module.exports = app;