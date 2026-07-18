// RF-08 — Servicios "On The Go": empresas y particulares (Fase 4: T16, edición: T28)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const {
  crearCorporativoService,
  CorporativoInvalidoError,
  CorporativoNoEncontradoError,
} = require('../services/corporativoService');

const servicio = crearCorporativoService(prisma);

// Los errores inesperados (Prisma, red...) se registran en el log del servidor
// pero al usuario final se le responde un mensaje simple, nunca el error crudo.
function error500(res, e, mensaje) {
  console.error('[corporativos]', e);
  res.status(500).json({ error: mensaje });
}

// POST /api/corporativos — registrar solicitud (EMPRESA o PARTICULAR)
router.post('/', verificarToken, permitirRoles('PROPIETARIA', 'RECEPCION'), async (req, res) => {
  try { res.status(201).json(await servicio.registrarSolicitud(req.body)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    error500(res, e, 'No se pudo registrar la solicitud. Intenta de nuevo.');
  }
});

// PUT /api/corporativos/:id — editar datos de la solicitud
router.put('/:id', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.editarSolicitud(Number(req.params.id), req.body)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    if (e instanceof CorporativoNoEncontradoError) return res.status(404).json({ error: 'La solicitud ya no existe.' });
    error500(res, e, 'No se guardaron los cambios. Intenta de nuevo.');
  }
});

// PUT /api/corporativos/:id/asignar — asigna educadora, pasa a CONFIRMADO
router.put('/:id/asignar', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.asignarEducadora(Number(req.params.id), req.body.educadoraId)); }
  catch (e) { error500(res, e, 'No se pudo asignar la educadora. Intenta de nuevo.'); }
});

// PUT /api/corporativos/:id/materiales — asigna materiales del inventario al evento
router.put('/:id/materiales', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.asignarMateriales(Number(req.params.id), req.body.materiales)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    if (e instanceof CorporativoNoEncontradoError) return res.status(404).json({ error: 'La solicitud ya no existe.' });
    error500(res, e, 'No se pudieron asignar los materiales. Intenta de nuevo.');
  }
});

// PUT /api/corporativos/:id/estado
router.put('/:id/estado', verificarToken, permitirRoles('PROPIETARIA'), async (req, res) => {
  try { res.json(await servicio.cambiarEstado(Number(req.params.id), req.body.estado)); }
  catch (e) {
    if (e instanceof CorporativoInvalidoError) return res.status(400).json({ error: e.message });
    error500(res, e, 'No se pudo cambiar el estado. Intenta de nuevo.');
  }
});

// GET /api/corporativos
router.get('/', verificarToken, permitirRoles('PROPIETARIA', 'RECEPCION'), async (_req, res) => {
  try { res.json(await servicio.listar()); }
  catch (e) { error500(res, e, 'No se pudieron cargar las solicitudes.'); }
});

module.exports = router;
