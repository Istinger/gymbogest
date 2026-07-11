// Extensión RF-01/RF-03 — Catálogo de paquetes y prueba gratis por registro.
// La PROPIETARIA gestiona el catálogo; Recepción lo consulta para ofrecer.
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearPaqueteCatalogoService, CatalogoInvalidoError } =
  require('../services/paqueteCatalogoService');

const servicio = crearPaqueteCatalogoService(prisma);

const manejarError = (e, res) => {
  if (e instanceof CatalogoInvalidoError) return res.status(400).json({ error: e.message });
  if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un paquete con ese nombre' });
  res.status(500).json({ error: e.message });
};

// GET /api/paquetes-catalogo — Recepción ofrece solo activos; Propietaria ve todo
router.get('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try {
    const soloActivos = req.usuario.rol !== 'PROPIETARIA' || req.query.activos === 'true';
    res.json(await servicio.listarCatalogo({ soloActivos }));
  } catch (e) { manejarError(e, res); }
});

// GET /api/paquetes-catalogo/prueba — configuración de la prueba gratis
router.get('/prueba', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (_req, res) => {
  try { res.json(await servicio.obtenerConfigPrueba()); }
  catch (e) { manejarError(e, res); }
});

// PUT /api/paquetes-catalogo/prueba — habilitar/deshabilitar y días (solo Propietaria)
router.put('/prueba', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.actualizarConfigPrueba(req.body, req.usuario.id)); }
  catch (e) { manejarError(e, res); }
});

// POST /api/paquetes-catalogo — crear paquete (solo Propietaria)
router.post('/', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.status(201).json(await servicio.crearPaquete(req.body, req.usuario.id)); }
  catch (e) { manejarError(e, res); }
});

// PUT /api/paquetes-catalogo/:id — editar / activar / desactivar (solo Propietaria)
router.put('/:id', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.actualizarPaquete(req.params.id, req.body, req.usuario.id)); }
  catch (e) { manejarError(e, res); }
});

// DELETE /api/paquetes-catalogo/:id — eliminar del catálogo (solo Propietaria)
router.delete('/:id', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.eliminarPaquete(req.params.id, req.usuario.id)); }
  catch (e) { manejarError(e, res); }
});

module.exports = router;
