// RF-05 — Seguimiento del desarrollo (Fase 3: T13)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearProgresoService, ProgresoInvalidoError, AccesoDenegadoError } =
  require('../services/progresoService');

const servicio = crearProgresoService(prisma);

// POST /api/progresos — solo la Educadora registra observaciones
router.post('/', verificarToken, permitirRoles('EDUCADORA'), async (req, res) => {
  try {
    const p = await servicio.registrarProgreso({ ...req.body, usuarioId: req.usuario.id });
    res.status(201).json(p);
  } catch (e) {
    if (e instanceof ProgresoInvalidoError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/progresos/nino/:ninoId — el TUTOR solo ve a sus hijos (LOPDP)
router.get('/nino/:ninoId', verificarToken,
  permitirRoles('EDUCADORA', 'RECEPCION', 'PROPIETARIA', 'TUTOR'), async (req, res) => {
    try {
      const historial = await servicio.historial(Number(req.params.ninoId), {
        rol: req.usuario.rol, usuarioId: req.usuario.id,
      });
      res.json(historial);
    } catch (e) {
      if (e instanceof AccesoDenegadoError) return res.status(403).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

module.exports = router;
