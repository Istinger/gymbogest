// Fase 2: T10 — Agenda del día (wireframe 3, panel de Recepción)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearAgendaService } = require('../services/agendaService');

const servicio = crearAgendaService(prisma);

// GET /api/agenda?fecha=YYYY-MM-DD
router.get('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA', 'EDUCADORA'), async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    res.json(await servicio.agendaDelDia(fecha));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
