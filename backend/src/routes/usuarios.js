// RNF-01 / T22 — Administración de cuentas y bitácora de ingresos (solo ADMIN)
// El rol ADMIN existe para separar la gestión de cuentas de la operación:
// PROPIETARIA ve el negocio (indicadores/corporativos), ADMIN administra
// accesos. Los roles ADMIN y PROPIETARIA están protegidos contra cambios.
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearUsuarioService, UsuarioInvalidoError, CorreoDuplicadoError, RolProtegidoError } =
  require('../services/usuarioService');

const servicio = crearUsuarioService(prisma);

function responderError(e, res) {
  if (e instanceof UsuarioInvalidoError) return res.status(400).json({ error: e.message });
  if (e instanceof RolProtegidoError) return res.status(403).json({ error: e.message });
  if (e instanceof CorreoDuplicadoError) return res.status(409).json({ error: e.message });
  res.status(500).json({ error: e.message });
}

// GET /api/usuarios — listado de cuentas con su persona vinculada
router.get('/', verificarToken, permitirRoles('ADMIN'), async (_req, res) => {
  try { res.json(await servicio.listarUsuarios()); }
  catch (e) { responderError(e, res); }
});

// GET /api/usuarios/accesos — bitácora de ingresos (logins exitosos y fallidos)
router.get('/accesos', verificarToken, permitirRoles('ADMIN'), async (req, res) => {
  try { res.json(await servicio.listarAccesos(req.query)); }
  catch (e) { responderError(e, res); }
});

// POST /api/usuarios — crear cuenta con rol operativo (RECEPCION/EDUCADORA/TUTOR)
router.post('/', verificarToken, permitirRoles('ADMIN'), async (req, res) => {
  try { res.status(201).json(await servicio.crearUsuario(req.body, req.usuario.id)); }
  catch (e) { responderError(e, res); }
});

// PUT /api/usuarios/:id — cambiar rol (solo operativos), correo, contraseña y/o nombre
router.put('/:id', verificarToken, permitirRoles('ADMIN'), async (req, res) => {
  try { res.json(await servicio.actualizarUsuario(Number(req.params.id), req.body, req.usuario.id)); }
  catch (e) { responderError(e, res); }
});

module.exports = router;
