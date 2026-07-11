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
const {
  crearReservaService, CupoLlenoError, SinSaldoError, ReservaDuplicadaError, ChoqueHorarioError,
  NinoInactivoError, PaqueteVencidoError,
} = require('../src/services/reservaService');

function crearPrismaFalso({
  ocupados, saldoClases, reservaAnterior, reservaExistente = null, reservaEnChoque = null,
  ninoActivo = true, fechaVencimiento = null,
}) {
  const tx = {
    $executeRawUnsafe: jest.fn(),
    nino: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, activo: ninoActivo }),
    },
    $queryRaw: jest.fn().mockResolvedValue([
      { id: 10, cupoMaximo: 9, fechaHora: new Date('2026-07-10T10:00:00Z') },
    ]),
    reserva: {
      count: jest.fn().mockResolvedValue(ocupados),
      create: jest.fn().mockResolvedValue({ id: 99, estado: 'ACTIVA' }),
      update: jest.fn().mockResolvedValue({ id: 1, estado: 'CANCELADA', paqueteId: 5 }),
      findUnique: jest.fn().mockResolvedValue(reservaAnterior),
      // findFirst se usa para 2 reglas: duplicado (@@unique) y choque de horario
      // (esta última filtra por la relación `clase`); se distingue por el where
      findFirst: jest.fn(({ where }) =>
        Promise.resolve(where.clase ? reservaEnChoque : reservaExistente)),
    },
    paquete: {
      findUnique: jest.fn().mockResolvedValue({ id: 5, saldoClases, fechaVencimiento }),
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

describe('regla @@unique([ninoId, claseId]): sin reservas duplicadas', () => {
  test('rechaza si el niño ya tiene una reserva en la misma clase', async () => {
    const { prisma, tx } = crearPrismaFalso({
      ocupados: 2, saldoClases: 3,
      reservaExistente: { id: 50, ninoId: 1, claseId: 10, estado: 'ACTIVA' },
    });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(ReservaDuplicadaError);
    expect(tx.reserva.create).not.toHaveBeenCalled();
  });
});

describe('regla de negocio: sin choque de horarios', () => {
  test('rechaza si el niño ya tiene otra clase ACTIVA a la misma hora', async () => {
    const { prisma, tx } = crearPrismaFalso({
      ocupados: 2, saldoClases: 3,
      reservaEnChoque: { id: 60, estado: 'ACTIVA', clase: { id: 11, programa: 'MUSIC' } },
    });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(ChoqueHorarioError);
    expect(tx.reserva.create).not.toHaveBeenCalled();
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
describe('Extensión CU-01: niño inactivo (baja suave) no puede reservar', () => {
  test('rechaza la reserva si el niño está inactivo', async () => {
    const { prisma } = crearPrismaFalso({ ocupados: 0, saldoClases: 5, ninoActivo: false });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase({ ninoId: 1, claseId: 10, paqueteId: 5 }))
      .rejects.toThrow(NinoInactivoError);
  });

  test('con el niño activo la reserva procede con normalidad', async () => {
    const { prisma } = crearPrismaFalso({ ocupados: 0, saldoClases: 5, ninoActivo: true });
    const servicio = crearReservaService(prisma);
    const r = await servicio.reservarClase({ ninoId: 1, claseId: 10, paqueteId: 5 });
    expect(r.estado).toBe('ACTIVA');
  });
});

describe('Extensión RF-03: vigencia del paquete (el tiempo terminó)', () => {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const enUnMes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  test('rechaza reservar con un paquete VENCIDO aunque tenga saldo', async () => {
    const { prisma, tx } = crearPrismaFalso({
      ocupados: 0, saldoClases: 5, fechaVencimiento: ayer,
    });
    const servicio = crearReservaService(prisma);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(PaqueteVencidoError);
    await expect(servicio.reservarClase(datos)).rejects.toThrow(/venció/);
    expect(tx.reserva.create).not.toHaveBeenCalled(); // no se creó ni descontó nada
    expect(tx.paquete.update).not.toHaveBeenCalled();
  });

  test('un paquete con vencimiento FUTURO reserva con normalidad', async () => {
    const { prisma } = crearPrismaFalso({
      ocupados: 0, saldoClases: 5, fechaVencimiento: enUnMes,
    });
    const servicio = crearReservaService(prisma);
    const r = await servicio.reservarClase(datos);
    expect(r.estado).toBe('ACTIVA');
  });

  test('un paquete SIN fecha de vencimiento (null) nunca vence', async () => {
    const { prisma } = crearPrismaFalso({
      ocupados: 0, saldoClases: 5, fechaVencimiento: null,
    });
    const servicio = crearReservaService(prisma);
    const r = await servicio.reservarClase(datos);
    expect(r.estado).toBe('ACTIVA');
  });

  test('reagendar una clase ya pagada SÍ se permite con el paquete vencido', async () => {
    // La clase ya fue descontada del saldo: solo cambia de horario (spec)
    const { prisma, tx } = crearPrismaFalso({
      ocupados: 2, saldoClases: 0, fechaVencimiento: ayer,
      reservaAnterior: { id: 1, ninoId: 3, claseId: 10, paqueteId: 5, estado: 'ACTIVA' },
    });
    const servicio = crearReservaService(prisma);
    const r = await servicio.reagendarReserva(1, 20, 7);
    expect(r.estado).toBe('ACTIVA');
    expect(tx.paquete.update).not.toHaveBeenCalled();
  });
});
