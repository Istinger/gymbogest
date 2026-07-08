// ============================================================
// services/asistenciaService.js
// RF-04 — Registrar asistencia (Fase 3: T12)
// Criterio de aceptación (HF-4): estado ∈ {ASISTIO, FALTO, CLASE_PRUEBA};
// SOLO niños con reserva ACTIVA en esa clase pueden tener asistencia.
// SOLID-D: recibe prisma inyectado.
// ============================================================
const ESTADOS = ['ASISTIO', 'FALTO', 'CLASE_PRUEBA'];

class AsistenciaInvalidaError extends Error {}

function crearAsistenciaService(prisma) {
  async function registrarAsistencia({ ninoId, claseId, estado, usuarioId }) {
    if (!ESTADOS.includes(estado)) {
      throw new AsistenciaInvalidaError(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
    }
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      // HF-4: el niño debe tener reserva ACTIVA en esa clase
      const reserva = await tx.reserva.findFirst({
        where: { ninoId, claseId, estado: 'ACTIVA' },
      });
      if (!reserva) {
        throw new AsistenciaInvalidaError(
          'El niño no tiene una reserva activa en esta clase');
      }
      return tx.asistencia.create({ data: { ninoId, claseId, estado } });
    });
  }

  // Lista de asistencia de una clase (panel Educadora)
  async function listarPorClase(claseId) {
    return prisma.asistencia.findMany({
      where: { claseId },
      include: { nino: true },
      orderBy: { fecha: 'desc' },
    });
  }

  return { registrarAsistencia, listarPorClase };
}

module.exports = { crearAsistenciaService, AsistenciaInvalidaError, ESTADOS };
