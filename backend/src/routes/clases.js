// RF-02 — CRUD de clases (Fase 2: T07)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearClaseService, ValidacionClaseError } = require('../services/claseService');

const servicio = crearClaseService(prisma);

// POST /api/clases — solo Recepción/Propietaria programan clases
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try { res.status(201).json(await servicio.crearClase(req.body)); }
  catch (e) {
    if (e instanceof ValidacionClaseError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clases?desde=&hasta= — cualquier usuario autenticado (padres ven el calendario)
router.get('/', verificarToken, async (req, res) => {
  try { res.json(await servicio.listarClases(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/clases/:id
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const clase = await servicio.obtenerClase(Number(req.params.id));
    if (!clase) return res.status(404).json({ error: 'Clase no encontrada' });
    res.json(clase);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/clases/:id
router.put('/:id', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.actualizarClase(Number(req.params.id), req.body)); }
  catch (e) {
    if (e instanceof ValidacionClaseError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
