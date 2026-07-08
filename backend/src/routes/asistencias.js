// RF-04 — Registro de asistencia (Fase 3: T12)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearAsistenciaService, AsistenciaInvalidaError } = require('../services/asistenciaService');

const servicio = crearAsistenciaService(prisma);

// POST /api/asistencias — la registra la Educadora (o Recepción)
router.post('/', verificarToken, permitirRoles('EDUCADORA', 'RECEPCION'), async (req, res) => {
  try {
    const a = await servicio.registrarAsistencia({ ...req.body, usuarioId: req.usuario.id });
    res.status(201).json(a);
  } catch (e) {
    if (e instanceof AsistenciaInvalidaError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/asistencias/clase/:claseId — lista de la clase (panel Educadora)
router.get('/clase/:claseId', verificarToken,
  permitirRoles('EDUCADORA', 'RECEPCION', 'PROPIETARIA'), async (req, res) => {
    try { res.json(await servicio.listarPorClase(Number(req.params.claseId))); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

module.exports = router;
