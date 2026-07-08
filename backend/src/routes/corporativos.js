// RF-08 — Servicios corporativos "On The Go" (Fase 4: T16)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearCorporativoService, CorporativoInvalidoError } =
  require('../services/corporativoService');

const servicio = crearCorporativoService(prisma);

// POST /api/corporativos — registrar solicitud de empresa
router.post('/', verificarToken, permitirRoles('PROPIETARIA', 'RECEPCION'), async (req, res) => {
  try { res.status(201).json(await servicio.registrarSolicitud(req.body)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/corporativos/:id/asignar — asigna educadora, pasa a CONFIRMADO
router.put('/:id/asignar', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.asignarEducadora(Number(req.params.id), req.body.educadoraId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/corporativos/:id/estado
router.put('/:id/estado', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.cambiarEstado(Number(req.params.id), req.body.estado)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/corporativos
router.get('/', verificarToken, permitirRoles('PROPIETARIA', 'RECEPCION'), async (_req, res) => {
  try { res.json(await servicio.listar()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
