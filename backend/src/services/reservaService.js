// ============================================================
// services/reservaService.js
// RF-02 / RF-03 / CU-02 — Reservar clase con control de cupo
// Implementa el DIAGRAMA DE SECUENCIA 2 del Avance 6.
//
// SOLID-D (inversión de dependencias): el servicio NO crea su
// PrismaClient; lo recibe inyectado vía crearReservaService(prisma).
// Beneficios: (1) las pruebas unitarias inyectan una BD falsa sin
// trucos de mock, (2) un solo cliente/conexión en toda la app.
//
// NOTA: `Prisma.TransactionIsolationLevel` es solo un TIPO de
// TypeScript, no existe como objeto en tiempo de ejecución — el
// nivel de aislamiento se pasa como el STRING literal 'Serializable'.
// ============================================================

class CupoLlenoError extends Error {}
class SinSaldoError extends Error {}

function crearReservaService(prisma) {
  async function reservarClase({ ninoId, claseId, paqueteId, usuarioId }) {
    return prisma.$transaction(async (tx) => {
      // auditoría por triggers: identifica al usuario de esta transacción
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }

      // 3-4: consultar cupo con la fila de la clase bloqueada (evita carrera)
      const [clase] = await tx.$queryRaw`
        SELECT id, "cupoMaximo" FROM "Clase" WHERE id = ${claseId} FOR UPDATE`;
      if (!clase) throw new Error('La clase no existe');

      const ocupados = await tx.reserva.count({
        where: { claseId, estado: 'ACTIVA' },
      });
      if (ocupados >= clase.cupoMaximo) {
        // CU-02, excepción paso 3: clase llena
        throw new CupoLlenoError(`La clase está llena (${ocupados}/${clase.cupoMaximo})`);
      }

      // 5: validarSaldoPaquete() — autollamado del diagrama de secuencia
      const paquete = await tx.paquete.findUnique({ where: { id: paqueteId } });
      if (!paquete || paquete.saldoClases <= 0) {
        // CU-02, excepción paso 4: sin saldo
        throw new SinSaldoError('El paquete no tiene clases disponibles');
      }

      // 6: registrarReserva() y descontar del paquete (atomicidad ACID)
      const reserva = await tx.reserva.create({
        data: { ninoId, claseId, paqueteId, estado: 'ACTIVA' },
      });
      await tx.paquete.update({
        where: { id: paqueteId },
        data: { saldoClases: { decrement: 1 } },
      });

      return reserva; // 7: reservaConfirmada
    }, { isolationLevel: 'Serializable' });
  }

  async function cancelarReserva(reservaId, usuarioId) {
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      const reserva = await tx.reserva.update({
        where: { id: reservaId },
        data: { estado: 'CANCELADA' },
      });
      await tx.paquete.update({
        where: { id: reserva.paqueteId },
        data: { saldoClases: { increment: 1 } }, // CU-02: devuelve el saldo
      });
      return reserva;
    });
  }

  // T09 — Reagendar: libera el cupo de la clase anterior y toma el nuevo,
  // SIN doble descuento del paquete (criterio de aceptación HF-3).
  // Implementa el mismo control de cupo/saldo que reservarClase.
  async function reagendarReserva(reservaId, nuevaClaseId, usuarioId) {
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }

      const anterior = await tx.reserva.findUnique({ where: { id: reservaId } });
      if (!anterior || anterior.estado !== 'ACTIVA') {
        throw new Error('La reserva no existe o ya no está activa');
      }

      // Verificar cupo de la NUEVA clase (con bloqueo, igual que reservarClase)
      const [claseNueva] = await tx.$queryRaw`
        SELECT id, "cupoMaximo" FROM "Clase" WHERE id = ${nuevaClaseId} FOR UPDATE`;
      if (!claseNueva) throw new Error('La clase destino no existe');

      const ocupados = await tx.reserva.count({
        where: { claseId: nuevaClaseId, estado: 'ACTIVA' },
      });
      if (ocupados >= claseNueva.cupoMaximo) {
        throw new CupoLlenoError(`La clase destino está llena (${ocupados}/${claseNueva.cupoMaximo})`);
      }

      // Liberar la reserva anterior (sin devolver saldo: es un reagendamiento, no cancelación)
      await tx.reserva.update({ where: { id: reservaId }, data: { estado: 'REAGENDADA' } });

      // Crear la nueva reserva ligada al MISMO paquete (no se descuenta de nuevo)
      const nueva = await tx.reserva.create({
        data: {
          ninoId: anterior.ninoId,
          claseId: nuevaClaseId,
          paqueteId: anterior.paqueteId,
          estado: 'ACTIVA',
        },
      });

      return nueva;
    });
  }

  return { reservarClase, cancelarReserva, reagendarReserva };
}

module.exports = { crearReservaService, CupoLlenoError, SinSaldoError };