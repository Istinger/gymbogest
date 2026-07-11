// RF-01 / CU-01 — Gestión de familias y niños (Fase 1: T04, T05, T06)
const router = require('express').Router();
const prisma = require('../prisma'); // singleton inyectado (SOLID-D)
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { crearFamiliaService, ValidacionError } = require('../services/familiaService');

const servicio = crearFamiliaService(prisma);

// POST /api/familias — T04 (+ T05 si la cédula ya existe)
// La inscripción la hace Recepción en el local, o el propio Tutor desde la web (HF-1)
router.post('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA', 'EDUCADORA', 'TUTOR'),
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

// GET /api/familias/mis-ninos — Niños del tutor logueado
router.get('/mis-ninos', verificarToken, permitirRoles('TUTOR'),
  async (req, res) => {
    try {
      // El JWT solo trae { id, rol }: buscar la persona del usuario en BD
      const usuario = await prisma.usuario.findUnique({
        where: { id: req.usuario.id },
      });

      if (!usuario?.personaId) {
        return res.status(400).json({ error: 'Usuario sin persona asociada' });
      }

      // Obtener los tutores asociados a esta persona
      const tutores = await prisma.tutor.findMany({
        where: { personaId: usuario.personaId },
      });

      if (tutores.length === 0) {
        return res.json([]);
      }

      // Obtener niños de las familias de estos tutores
      const ninos = await prisma.nino.findMany({
        where: {
          familia: {
            id: {
              in: tutores.map((t) => t.familiaId),
            },
          },
        },
        include: {
          familia: {
            include: { paquetes: true },
          },
        },
      });
      res.json(ninos);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

// GET /api/familias — T06 (listado para el panel de Recepción)
router.get('/', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA', 'EDUCADORA'),
  async (_req, res) => {
    try { res.json(await servicio.listarFamilias()); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

// PUT /api/familias/tutor/:tutorId — corregir typos de la inscripción (extensión CU-01).
// Recepción edita contacto; la CÉDULA solo la corrige la Propietaria (clave de identidad, T05).
router.put('/tutor/:tutorId', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (req, res) => {
    try {
      const tutor = await servicio.actualizarTutor(req.params.tutorId, req.body, {
        usuarioId: req.usuario.id,
        permitirCedula: req.usuario.rol === 'PROPIETARIA',
      });
      res.json(tutor);
    } catch (e) {
      if (e instanceof ValidacionError) {
        const esPermiso = e.message.includes('Solo la Propietaria');
        return res.status(esPermiso ? 403 : 400).json({ error: e.message });
      }
      if (e.code === 'P2002') return res.status(409).json({ error: 'Registro duplicado', campos: e.meta?.target });
      res.status(500).json({ error: e.message });
    }
  });

// PUT /api/familias/nino/:ninoId — corregir typos del niño (extensión CU-01)
router.put('/nino/:ninoId', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (req, res) => {
    try {
      res.json(await servicio.actualizarNino(req.params.ninoId, req.body, { usuarioId: req.usuario.id }));
    } catch (e) {
      if (e instanceof ValidacionError) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

// POST /api/familias/:id/paquetes — contratar un paquete del catálogo (extensión RF-03).
// Recepción vende: elige SOLO del catálogo activo (los valores se copian de la
// plantilla). Pago opcional (conPago) — se cobra por fuera si no se marca.
router.post('/:id/paquetes', verificarToken, permitirRoles('RECEPCION', 'PROPIETARIA'),
  async (req, res) => {
    try {
      const resultado = await servicio.contratarPaquete(req.params.id, req.body, {
        usuarioId: req.usuario.id,
      });
      res.status(201).json(resultado);
    } catch (e) {
      if (e instanceof ValidacionError) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

// PUT /api/familias/paquete/:paqueteId — ajuste manual de saldo/clases por semana.
// SOLO PROPIETARIA: el saldo es dinero en especie (Recepción solo lo VE).
router.put('/paquete/:paqueteId', verificarToken, permitirRoles('PROPIETARIA'),
  async (req, res) => {
    try {
      res.json(await servicio.ajustarPaquete(req.params.paqueteId, req.body, {
        usuarioId: req.usuario.id,
      }));
    } catch (e) {
      if (e instanceof ValidacionError) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
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
