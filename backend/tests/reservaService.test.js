// ============================================================
// PRUEBA UNITARIA — reservaService (HF-3 / RF-02 / CU-02)
// Gracias a la inyección de dependencias (SOLID-D), aquí NO se usa
// jest.mock('@prisma/client'): se construye una BD falsa a mano y
// se inyecta directo con crearReservaService(prismaFalso).
// Casos = EXCEPCIONES de la especificación del caso de uso CU-02:
//   exc. paso 3: clase llena (cupo = 9)  → rechazar
//   exc. paso 4: paquete sin saldo       → rechazar
// Ejecutar: npm test
// ============================================================
const { crearReservaService, CupoLlenoError, SinSaldoError } =
  require('../src/services/reservaService');

function crearPrismaFalso({ ocupados, saldoClases, reservaAnterior }) {
  const tx = {
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 10, cupoMaximo: 9 }]),
    reserva: {
      count: jest.fn().mockResolvedValue(ocupados),
      create: jest.fn().mockResolvedValue({ id: 99, estado: 'ACTIVA' }),
      update: jest.fn().mockResolvedValue({ id: 1, estado: 'CANCELADA', paqueteId: 5 }),
      findUnique: jest.fn().mockResolvedValue(reservaAnterior),
    },
    paquete: {
      findUnique: jest.fn().mockResolvedValue({ id: 5, saldoClases }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
  return { prisma, tx };
}

const datos = { ninoId: 1, claseId: 10, paqueteId: 5 };

describe('RF-02: control de cupo máximo (9 niños)', () => {
  test('rechaza la reserva n.º 10 cuando la clase está llena (CU-02 exc. 3)', async () => {
    const { prisma, tx } = crearPrismaFalso({ ocupados: 9, saldoClases: 3 });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(CupoLlenoError);
    expect(tx.reserva.create).not.toHaveBeenCalled(); // no se creó nada
  });

  test('acepta la reserva n.º 9 (último cupo)', async () => {
    const { prisma, tx } = crearPrismaFalso({ ocupados: 8, saldoClases: 3 });
    const servicio = crearReservaService(prisma);
    const r = await servicio.reservarClase(datos);
    expect(r.id).toBe(99);
    expect(tx.reserva.create).toHaveBeenCalledTimes(1);
  });
});

describe('RF-03: validación del saldo del paquete', () => {
  test('rechaza si el paquete no tiene clases disponibles (CU-02 exc. 4)', async () => {
    const { prisma } = crearPrismaFalso({ ocupados: 2, saldoClases: 0 });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(SinSaldoError);
  });

  test('flujo normal: crea la reserva y descuenta 1 del saldo', async () => {
    const { prisma, tx } = crearPrismaFalso({ ocupados: 4, saldoClases: 3 });
    const servicio = crearReservaService(prisma);
    await servicio.reservarClase(datos);
    expect(tx.paquete.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { saldoClases: { decrement: 1 } },
    });
  });
});

describe('CU-02: cancelar reserva', () => {
  test('devuelve 1 clase al saldo del paquete', async () => {
    const { prisma, tx } = crearPrismaFalso({ ocupados: 0, saldoClases: 0 });
    const servicio = crearReservaService(prisma);
    await servicio.cancelarReserva(1, 7);
    expect(tx.paquete.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { saldoClases: { increment: 1 } },
    });
  });
});

describe('T09 / CU-02: reagendar reserva', () => {
  const anterior = { id: 1, ninoId: 3, claseId: 10, paqueteId: 5, estado: 'ACTIVA' };

  test('libera la clase anterior y crea la nueva SIN doble descuento del paquete', async () => {
    const { prisma, tx } = crearPrismaFalso({ ocupados: 4, saldoClases: 3, reservaAnterior: anterior });
    const servicio = crearReservaService(prisma);
    await servicio.reagendarReserva(1, 20, 7);

    expect(tx.reserva.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'REAGENDADA' } });
    expect(tx.reserva.create).toHaveBeenCalledWith({
      data: { ninoId: 3, claseId: 20, paqueteId: 5, estado: 'ACTIVA' },
    });
    // clave del criterio de aceptación: NO se toca el saldo del paquete
    expect(tx.paquete.update).not.toHaveBeenCalled();
  });

  test('rechaza reagendar a una clase destino llena', async () => {
    const { prisma } = crearPrismaFalso({ ocupados: 9, saldoClases: 3, reservaAnterior: anterior });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reagendarReserva(1, 20, 7)).rejects.toThrow(CupoLlenoError);
  });

  test('rechaza si la reserva original ya no está activa', async () => {
    const { prisma } = crearPrismaFalso({
      ocupados: 2, saldoClases: 3,
      reservaAnterior: { ...anterior, estado: 'CANCELADA' },
    });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reagendarReserva(1, 20, 7)).rejects.toThrow();
  });
});