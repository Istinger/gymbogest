// ============================================================
// services/corporativoService.js
// RF-08 — Servicios "Gymboree On The Go": corporativos (empresas)
// y particulares (clase privada de una familia). (Fase 4: T16, edición: T28)
// Materializa la oportunidad O4 de la estrategia MAX-MAX.
// SOLID-D: recibe prisma inyectado.
// ============================================================
class CorporativoInvalidoError extends Error {}
class CorporativoNoEncontradoError extends Error {}

const ESTADOS = ['SOLICITADO', 'CONFIRMADO', 'EJECUTADO', 'CANCELADO'];
const TIPOS = ['EMPRESA', 'PARTICULAR'];

function validarDatos({ empresa, fecha, numNinos, tipo }) {
  if (!empresa?.trim()) throw new CorporativoInvalidoError('empresa/solicitante es obligatorio');
  if (!fecha || isNaN(Date.parse(fecha))) throw new CorporativoInvalidoError('fecha inválida');
  if (!numNinos || numNinos <= 0) throw new CorporativoInvalidoError('numNinos debe ser mayor a 0');
  if (tipo !== undefined && !TIPOS.includes(tipo)) {
    throw new CorporativoInvalidoError(`tipo debe ser uno de: ${TIPOS.join(', ')}`);
  }
}

function crearCorporativoService(prisma) {
  async function registrarSolicitud({ empresa, contacto, fecha, numNinos, tipo }) {
    validarDatos({ empresa, fecha, numNinos, tipo });
    return prisma.eventoCorporativo.create({
      data: {
        empresa,
        contacto,
        fecha: new Date(fecha),
        numNinos,
        tipo: tipo || 'EMPRESA',
        estado: 'SOLICITADO',
      },
    });
  }

  // Edita los datos de una solicitud (cualquier estado: la Propietaria puede
  // corregir también eventos EJECUTADOS/CANCELADOS, p. ej. datos mal digitados)
  async function editarSolicitud(id, { empresa, contacto, fecha, numNinos, tipo }) {
    const evento = await prisma.eventoCorporativo.findUnique({ where: { id } });
    if (!evento) throw new CorporativoNoEncontradoError('evento no encontrado');
    validarDatos({ empresa, fecha, numNinos, tipo });
    return prisma.eventoCorporativo.update({
      where: { id },
      data: {
        empresa,
        contacto,
        fecha: new Date(fecha),
        numNinos,
        ...(tipo !== undefined && { tipo }),
      },
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

  return { registrarSolicitud, editarSolicitud, asignarEducadora, cambiarEstado, listar };
}

module.exports = {
  crearCorporativoService,
  CorporativoInvalidoError,
  CorporativoNoEncontradoError,
  ESTADOS,
  TIPOS,
};
