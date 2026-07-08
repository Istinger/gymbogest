// ============================================================
// services/pagoService.js
// RF-... — Registrar pagos con mock de facturación Dátil (Fase 4: T17)
// El diagrama de secuencia 1 (Avance 6) modela la emisión del
// comprobante como una llamada al sistema externo Dátil; aquí se
// simula esa respuesta (integración real queda en backlog.md).
// SOLID-D: recibe prisma inyectado.
// ============================================================
class PagoInvalidoError extends Error {}

// Mock del sistema externo Dátil — genera un número de comprobante.
// En producción esto sería una llamada HTTP real a su API.
function emitirComprobanteDatil({ familiaId, monto }) {
  const numero = `DTL-${Date.now()}-${familiaId}`;
  return { numeroComprobante: numero, monto, emitidoEn: new Date().toISOString() };
}

function crearPagoService(prisma) {
  async function registrarPago({ familiaId, monto, usuarioId }) {
    if (!monto || monto <= 0) throw new PagoInvalidoError('monto debe ser mayor a 0');

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      const familia = await tx.familia.findUnique({ where: { id: familiaId } });
      if (!familia) throw new PagoInvalidoError('La familia no existe');

      // 6-7 del diagrama de secuencia 1: emitir comprobante (mock Dátil)
      const comprobante = emitirComprobanteDatil({ familiaId, monto });

      return tx.pago.create({
        data: { familiaId, monto, numeroComprobante: comprobante.numeroComprobante },
      });
    });
  }

  async function listarPorFamilia(familiaId) {
    return prisma.pago.findMany({ where: { familiaId }, orderBy: { fecha: 'desc' } });
  }

  return { registrarPago, listarPorFamilia };
}

module.exports = { crearPagoService, PagoInvalidoError, emitirComprobanteDatil };
