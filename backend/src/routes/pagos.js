// Pagos con mock de facturación Dátil (Fase 4: T17)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearPagoService, PagoInvalidoError } = require('../services/pagoService');

const servicio = crearPagoService(prisma);

// POST /api/pagos
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try {
    const pago = await servicio.registrarPago({ ...req.body, usuarioId: req.usuario.id });
    res.status(201).json(pago);
  } catch (e) {
    if (e instanceof PagoInvalidoError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pagos/familia/:familiaId
router.get('/familia/:familiaId', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (req, res) => {
    try { res.json(await servicio.listarPorFamilia(Number(req.params.familiaId))); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

module.exports = router;
