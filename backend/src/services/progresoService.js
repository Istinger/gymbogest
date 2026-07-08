// ============================================================
// services/progresoService.js
// RF-05 — Seguimiento del desarrollo (Fase 3: T13)
// Criterio de aceptación (HF-5): historial consultable por el TUTOR
// del niño — y SOLO el suyo (LOPDP: datos de menores).
// SOLID-D: recibe prisma inyectado.
// ============================================================
const AREAS = ['motor', 'cognitivo', 'social', 'emocional'];

class ProgresoInvalidoError extends Error {}
class AccesoDenegadoError extends Error {}

function crearProgresoService(prisma) {
  async function registrarProgreso({ ninoId, area, observacion, usuarioId }) {
    if (!AREAS.includes(area)) {
      throw new ProgresoInvalidoError(`area debe ser una de: ${AREAS.join(', ')}`);
    }
    if (!observacion?.trim()) {
      throw new ProgresoInvalidoError('observacion es obligatoria');
    }
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.progreso.create({ data: { ninoId, area, observacion } });
    });
  }

  // LOPDP: verificación de propiedad — ¿este usuario TUTOR es tutor de este niño?
  async function esNinoDelTutor(usuarioId, ninoId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario?.personaId) return false;
    const tutor = await prisma.tutor.findUnique({ where: { personaId: usuario.personaId } });
    if (!tutor) return false;
    const nino = await prisma.nino.findUnique({ where: { id: ninoId } });
    return !!nino && nino.familiaId === tutor.familiaId;
  }

  async function historial(ninoId, { rol, usuarioId }) {
    // Personal interno ve todo; el TUTOR solo a sus propios hijos (HF-5)
    if (rol === 'TUTOR') {
      const autorizado = await esNinoDelTutor(usuarioId, ninoId);
      if (!autorizado) {
        throw new AccesoDenegadoError('Solo puede consultar el progreso de sus propios hijos');
      }
    }
    return prisma.progreso.findMany({
      where: { ninoId },
      orderBy: { fecha: 'desc' },
    });
  }

  return { registrarProgreso, historial, esNinoDelTutor };
}

module.exports = { crearProgresoService, ProgresoInvalidoError, AccesoDenegadoError, AREAS };
