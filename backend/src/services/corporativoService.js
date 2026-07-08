// ============================================================
// services/corporativoService.js
// RF-08 — Servicios corporativos "Gymboree On The Go" (Fase 4: T16)
// Materializa la oportunidad O4 de la estrategia MAX-MAX.
// SOLID-D: recibe prisma inyectado.
// ============================================================
class CorporativoInvalidoError extends Error {}

const ESTADOS = ['SOLICITADO', 'CONFIRMADO', 'EJECUTADO', 'CANCELADO'];

function crearCorporativoService(prisma) {
  async function registrarSolicitud({ empresa, contacto, fecha, numNinos }) {
    if (!empresa?.trim()) throw new CorporativoInvalidoError('empresa es obligatoria');
    if (!fecha || isNaN(Date.parse(fecha))) throw new CorporativoInvalidoError('fecha inválida');
    if (!numNinos || numNinos <= 0) throw new CorporativoInvalidoError('numNinos debe ser mayor a 0');
    return prisma.eventoCorporativo.create({
      data: { empresa, contacto, fecha: new Date(fecha), numNinos, estado: 'SOLICITADO' },
    });
  }

  // Asignar educadora — pasa de SOLICITADO a CONFIRMADO
  async function asignarEducadora(id, educadoraId) {
    return prisma.eventoCorporativo.update({
      where: { id },
      data: { educadoraId, estado: 'CONFIRMADO' },
    });
  }

  async function cambiarEstado(id, estado) {
    if (!ESTADOS.includes(estado)) {
      throw new CorporativoInvalidoError(`estado debe ser uno de: ${ESTADOS.join(', ')}`);
    }
    return prisma.eventoCorporativo.update({ where: { id }, data: { estado } });
  }

  async function listar() {
    return prisma.eventoCorporativo.findMany({
      include: { educadora: { include: { persona: true } } },
      orderBy: { fecha: 'asc' },
    });
  }

  return { registrarSolicitud, asignarEducadora, cambiarEstado, listar };
}

module.exports = { crearCorporativoService, CorporativoInvalidoError, ESTADOS };
