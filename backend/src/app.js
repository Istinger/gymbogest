// App Express separada del listen() para poder probarla con Supertest
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));       // RNF-01
app.use('/api/familias', require('./routes/familias')); // RF-01 (Fase 1)
app.use('/api/clases', require('./routes/clases'));     // RF-02 (Fase 2: T07)
app.use('/api/agenda', require('./routes/agenda'));     // T10 (Fase 2)
app.use('/api/reservas', require('./routes/reservas')); // RF-02/03 (+ T09 reagendar)
app.use('/api/asistencias', require('./routes/asistencias')); // RF-04 (Fase 3: T12)
app.use('/api/progresos', require('./routes/progresos'));     // RF-05 (Fase 3: T13)
app.use('/api/materiales', require('./routes/materiales'));   // RF-06 (Fase 3: T14)
app.use('/api/indicadores', require('./routes/indicadores'));  // RF-07 (Fase 4: T15)
app.use('/api/corporativos', require('./routes/corporativos')); // RF-08 (Fase 4: T16)
app.use('/api/pagos', require('./routes/pagos'));               // Fase 4: T17

app.get('/api/salud', (_req, res) => res.json({ ok: true, sistema: 'GymboGest' }));
module.exports = app;