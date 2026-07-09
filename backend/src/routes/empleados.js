// RF-02 (apoyo) — Listado de empleados para asignar clases a educadoras
// Lo usa el panel de Propietaria al programar clases (T07/T22).
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken, permitirRoles } = require('../middleware/auth');

// GET /api/empleados?rol=educadora — solo quien programa clases
router.get('/', verificarToken, permitirRoles('PROPIETARIA', 'RECEPCION'), async (req, res) => {
  try {
    const empleados = await prisma.empleado.findMany({
      where: req.query.rol ? { rol: req.query.rol } : {},
      include: { persona: { select: { id: true, nombres: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(empleados);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
