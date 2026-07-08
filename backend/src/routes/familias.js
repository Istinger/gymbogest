// RF-01 / CU-01 — Gestión de familias y niños (Fase 1: T04, T05, T06)
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearFamiliaService, ValidacionError } = require('../services/familiaService');

const servicio = crearFamiliaService(prisma);

// POST /api/familias — T04 (+ T05 si la cédula ya existe)
// La inscripción la hace Recepción en el local, o el propio Tutor desde la web (HF-1)
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA', 'TUTOR'),
  async (req, res) => {
    try {
      const resultado = await servicio.registrarFamilia({ ...req.body, usuarioId: req.usuario.id });
      // 200 si se asoció a familia existente, 201 si se creó una nueva
      res.status(resultado.asociado ? 200 : 201).json(resultado);
    } catch (e) {
      if (e instanceof ValidacionError) return res.status(400).json({ error: e.message });
      // colisión de unicidad inesperada (carrera): responder claro, no 500 crudo
      if (e.code === 'P2002') return res.status(409).json({ error: 'Registro duplicado', campos: e.meta?.target });
      res.status(500).json({ error: e.message });
    }
  });

// GET /api/familias — T06 (listado para el panel de Recepción)
router.get('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (_req, res) => {
    try { res.json(await servicio.listarFamilias()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

// GET /api/familias/:id — T06 (ficha completa)
router.get('/:id', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (req, res) => {
    try {
      const familia = await servicio.obtenerFamilia(Number(req.params.id));
      if (!familia) return res.status(404).json({ error: 'Familia no encontrada' });
      res.json(familia);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

module.exports = router;
