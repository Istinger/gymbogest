// RF-02 — CRUD de clases (Fase 2: T07)
const router = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearClaseService, ValidacionClaseError } = require('../services/claseService');

const servicio = crearClaseService(prisma);

// Autorización a nivel de DATO (RNF-01): resuelve el Empleado ligado al usuario
// autenticado (Usuario → Persona → Empleado) para filtrar "solo MIS clases".
async function empleadoIdDeUsuario(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { persona: { include: { empleado: true } } },
  });
  return usuario?.persona?.empleado?.id ?? null;
}

// POST /api/clases — solo Recepción/Propietaria programan clases
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'), async (req, res) => {
  try { res.status(201).json(await servicio.crearClase(req.body)); }
  catch (e) {
    if (e instanceof ValidacionClaseError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/clases?desde=&hasta= — cualquier usuario autenticado (padres ven el calendario).
// EDUCADORA: solo ve SUS clases asignadas (autorización a nivel de dato).
router.get('/', verificarToken, async (req, res) => {
  try {
    let empleadoId;
    if (req.usuario.rol === 'EDUCADORA') {
      empleadoId = await empleadoIdDeUsuario(req.usuario.id);
      if (!empleadoId) return res.json([]); // educadora sin ficha de empleado: sin clases
    }
    res.json(await servicio.listarClases({ ...req.query, empleadoId }));
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/clases/:id — EDUCADORA solo puede abrir una clase que imparte ella
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const clase = await servicio.obtenerClase(Number(req.params.id));
    if (!clase) return res.status(404).json({ error: 'Clase no encontrada' });
    if (req.usuario.rol === 'EDUCADORA') {
      const empleadoId = await empleadoIdDeUsuario(req.usuario.id);
      if (clase.empleadoId !== empleadoId) {
        return res.status(403).json({ error: 'No autorizado: la clase no está asignada a esta educadora' });
      }
    }
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
