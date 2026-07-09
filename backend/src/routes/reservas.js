// RF-02 / RF-03 / CU-02 — Agendamiento con control de cupos
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken } = require('../middleware/auth');
const { crearReservaService, CupoLlenoError, SinSaldoError, ReservaDuplicadaError } =
  require('../services/reservaService');

const servicio = crearReservaService(prisma);

// GET /api/reservas — Mis reservas (como tutor)
router.get('/', verificarToken, async (req, res) => {
  try {
    // El JWT solo trae { id, rol }: buscar la persona del usuario en BD
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
    });

    if (!usuario?.personaId) {
      return res.json([]);
    }

    // Obtener los tutores asociados a esta persona
    const tutores = await prisma.tutor.findMany({
      where: { personaId: usuario.personaId },
    });

    if (tutores.length === 0) {
      return res.json([]);
    }

    // Obtener reservas de los niños de las familias de estos tutores
    const reservas = await prisma.reserva.findMany({
      where: {
        nino: {
          familia: {
            id: {
              in: tutores.map((t) => t.familiaId),
            },
          },
        },
      },
      include: {
        nino: true,
        clase: {
          include: {
            empleado: {
              include: {
                persona: true,
              },
            },
          },
        },
        paquete: true,
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(reservas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/reservas — HF-3 (requiere autenticación)
router.post('/', verificarToken, async (req, res) => {
  try {
    const reserva = await servicio.reservarClase({ ...req.body, usuarioId: req.usuario.id });
    res.status(201).json(reserva);
  } catch (e) {
    if (e instanceof CupoLlenoError) return res.status(409).json({ error: e.message, sugerencia: 'horarios_alternativos' });
    if (e instanceof SinSaldoError) return res.status(409).json({ error: e.message, sugerencia: 'clases_adicionales' });
    // Carrera contra el @@unique([ninoId, claseId]): mismo mensaje amable
    if (e instanceof ReservaDuplicadaError || e.code === 'P2002')
      return res.status(409).json({ error: 'Este niño ya tiene una reserva en esta clase. Elige otro horario.', sugerencia: 'horarios_alternativos' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/reservas/:id/reagendar — T09 (CU-02: libera cupo anterior, sin doble descuento)
router.put('/:id/reagendar', verificarToken, async (req, res) => {
  try {
    const nueva = await servicio.reagendarReserva(
      Number(req.params.id), req.body.nuevaClaseId, req.usuario.id);
    res.json(nueva);
  } catch (e) {
    if (e instanceof CupoLlenoError) return res.status(409).json({ error: e.message, sugerencia: 'horarios_alternativos' });
    if (e instanceof ReservaDuplicadaError || e.code === 'P2002')
      return res.status(409).json({ error: 'Este niño ya tiene una reserva en la clase destino. Elige otro horario.', sugerencia: 'horarios_alternativos' });
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/reservas/:id/cancelar — CU-02: libera cupo y devuelve saldo
router.put('/:id/cancelar', verificarToken, async (req, res) => {
  try { res.json(await servicio.cancelarReserva(Number(req.params.id), req.usuario.id)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;