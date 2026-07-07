// RF-02 / RF-03 / CU-02 — Agendamiento con control de cupos
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken } = require('../middleware/auth');
const { crearReservaService, CupoLlenoError, SinSaldoError } =
  require('../services/reservaService');

const servicio = crearReservaService(prisma);

// POST /api/reservas — HF-3 (requiere autenticación)
router.post('/', verificarToken, async (req, res) => {
  try {
    const reserva = await servicio.reservarClase({ ...req.body, usuarioId: req.usuario.id });
    res.status(201).json(reserva);
  } catch (e) {
    if (e instanceof CupoLlenoError) return res.status(409).json({ error: e.message, sugerencia: 'horarios_alternativos' });
    if (e instanceof SinSaldoError) return res.status(409).json({ error: e.message, sugerencia: 'clases_adicionales' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/reservas/:id/cancelar — CU-02: libera cupo y devuelve saldo
router.put('/:id/cancelar', verificarToken, async (req, res) => {
  try { res.json(await servicio.cancelarReserva(Number(req.params.id), req.usuario.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
