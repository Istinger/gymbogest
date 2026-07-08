// RF-06 — Inventario de material didáctico (Fase 3: T14)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearMaterialService, MaterialInvalidoError } = require('../services/materialService');

const servicio = crearMaterialService(prisma);

// POST /api/materiales
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try { res.status(201).json(await servicio.crearMaterial(req.body)); }
  catch (e) {
    if (e instanceof MaterialInvalidoError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/materiales/:id/movimiento — entrada (delta>0) o salida (delta<0)
router.post('/:id/movimiento', verificarToken,
  permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
    try {
      const r = await servicio.registrarMovimiento({
        materialId: Number(req.params.id), delta: req.body.delta, usuarioId: req.usuario.id,
      });
      res.json(r);
    } catch (e) {
      if (e instanceof MaterialInvalidoError) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

// GET /api/materiales — listado con bandera enAlerta
router.get('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (_req, res) => {
  try { res.json(await servicio.listarMateriales()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/materiales/alertas — HF-6: bajo stock mínimo
router.get('/alertas', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (_req, res) => {
  try { res.json(await servicio.alertas()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
