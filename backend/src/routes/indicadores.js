// RF-07 / CU-03 — Indicadores reales para la propietaria (Fase 4: T15)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearIndicadorService } = require('../services/indicadorService');

const servicio = crearIndicadorService(prisma);

// GET /api/indicadores?desde=&hasta= — tablero consolidado (solo PROPIETARIA)
router.get('/', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.tablero(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/indicadores/canal — detalle: inscripciones por canal (mide MAX-MAX)
router.get('/canal', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.inscripcionesPorCanal(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/indicadores/conversion — clases de prueba que se convirtieron
router.get('/conversion', verificarToken, permitirRoles('PROPIETARIA'), async (_req, res) => {
  try { res.json(await servicio.conversionClasePrueba()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
