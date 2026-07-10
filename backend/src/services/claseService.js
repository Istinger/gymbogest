// ============================================================
// services/claseService.js
// RF-02 — Programar clases (Fase 2: T07)
// Criterio de aceptación (spec.md HF-2):
//   - Programa ∈ {PLAY_LEARN, MUSIC, ART, SCHOOL_SKILLS, PLAYLAB}
//   - cupoMaximo por defecto = 9, NO editable por encima de 9
// SOLID-D: recibe prisma inyectado.
// ============================================================
const PROGRAMAS = ['PLAY_LEARN', 'MUSIC', 'ART', 'SCHOOL_SKILLS', 'PLAYLAB'];
const CUPO_MAXIMO_ABSOLUTO = 9; // regla de la entrevista (Avance 1)

class ValidacionClaseError extends Error {}

function validarClase({ programa, fechaHora, cupoMaximo }) {
  const errores = [];
  if (!PROGRAMAS.includes(programa)) errores.push(`programa debe ser uno de: ${PROGRAMAS.join(', ')}`);
  if (!fechaHora || isNaN(Date.parse(fechaHora))) errores.push('fechaHora inválida');
  if (cupoMaximo !== undefined && cupoMaximo > CUPO_MAXIMO_ABSOLUTO) {
    errores.push(`cupoMaximo no puede superar ${CUPO_MAXIMO_ABSOLUTO} (regla de negocio, Avance 1)`);
  }
  if (errores.length) throw new ValidacionClaseError(errores.join('; '));
}

function crearClaseService(prisma) {
  async function crearClase({ programa, fechaHora, cupoMaximo, empleadoId }) {
    validarClase({ programa, fechaHora, cupoMaximo });
    return prisma.clase.create({
      data: {
        programa,
        fechaHora: new Date(fechaHora),
        cupoMaximo: cupoMaximo ?? CUPO_MAXIMO_ABSOLUTO,
        empleadoId,
      },
    });
  }

  // empleadoId (opcional): autorización a nivel de DATO — una EDUCADORA
  // solo lista SUS clases asignadas (mismo patrón que progresoService.esNinoDelTutor)
  async function listarClases({ desde, hasta, empleadoId } = {}) {
    return prisma.clase.findMany({
      where: {
        fechaHora: {
          ...(desde ? { gte: new Date(desde) } : {}),
          ...(hasta ? { lte: new Date(hasta) } : {}),
        },
        ...(empleadoId ? { empleadoId } : {}),
      },
      include: {
        empleado: { include: { persona: true } },
        _count: { select: { reservas: { where: { estado: 'ACTIVA' } } } },
      },
      orderBy: { fechaHora: 'asc' },
    });
  }

  async function obtenerClase(id) {
    return prisma.clase.findUnique({
      where: { id },
      include: {
        empleado: { include: { persona: true } },
        reservas: { where: { estado: 'ACTIVA' }, include: { nino: true } },
      },
    });
  }

  async function actualizarClase(id, datos) {
    if (datos.cupoMaximo !== undefined && datos.cupoMaximo > CUPO_MAXIMO_ABSOLUTO) {
      throw new ValidacionClaseError(`cupoMaximo no puede superar ${CUPO_MAXIMO_ABSOLUTO}`);
    }
    return prisma.clase.update({
      where: { id },
      data: {
        ...(datos.programa && { programa: datos.programa }),
        ...(datos.fechaHora && { fechaHora: new Date(datos.fechaHora) }),
        ...(datos.cupoMaximo !== undefined && { cupoMaximo: datos.cupoMaximo }),
        ...(datos.empleadoId && { empleadoId: datos.empleadoId }),
      },
    });
  }

  return { crearClase, listarClases, obtenerClase, actualizarClase };
}

module.exports = { crearClaseService, ValidacionClaseError, PROGRAMAS, CUPO_MAXIMO_ABSOLUTO };
