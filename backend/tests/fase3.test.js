// ============================================================
// PRUEBA UNITARIA — Fase 3 (T12 asistencia, T13 progreso, T14 inventario)
// Casos = criterios de aceptación de HF-4, HF-5 y HF-6 (spec.md).
// BD falsa inyectada (SOLID-D). Ejecutar: npm test
// ============================================================
const { crearAsistenciaService, AsistenciaInvalidaError } =
  require('../src/services/asistenciaService');
const { crearProgresoService, ProgresoInvalidoError, AccesoDenegadoError } =
  require('../src/services/progresoService');
const { crearMaterialService, MaterialInvalidoError } =
  require('../src/services/materialService');

// ---------- T12: Asistencia (HF-4) ----------
describe('RF-04: registrar asistencia', () => {
  function prismaFalso({ reservaActiva }) {
    const tx = {
      $executeRawUnsafe: jest.fn(),
      reserva: { findFirst: jest.fn().mockResolvedValue(reservaActiva) },
      asistencia: { create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 1, ...data })) },
    };
    return { prisma: { $transaction: jest.fn((fn) => fn(tx)) }, tx };
  }

  test('rechaza si el niño NO tiene reserva activa en la clase (HF-4)', async () => {
    const { prisma } = prismaFalso({ reservaActiva: null });
    const s = crearAsistenciaService(prisma);
    await expect(s.registrarAsistencia({ ninoId: 1, claseId: 2, estado: 'ASISTIO' }))
      .rejects.toThrow(AsistenciaInvalidaError);
  });

  test('rechaza un estado fuera del catálogo', async () => {
    const { prisma } = prismaFalso({ reservaActiva: { id: 1 } });
    const s = crearAsistenciaService(prisma);
    await expect(s.registrarAsistencia({ ninoId: 1, claseId: 2, estado: 'TARDE' }))
      .rejects.toThrow(AsistenciaInvalidaError);
  });

  test('registra CLASE_PRUEBA correctamente (insumo del indicador de conversión)', async () => {
    const { prisma, tx } = prismaFalso({ reservaActiva: { id: 1 } });
    const s = crearAsistenciaService(prisma);
    const a = await s.registrarAsistencia({ ninoId: 1, claseId: 2, estado: 'CLASE_PRUEBA' });
    expect(a.estado).toBe('CLASE_PRUEBA');
    expect(tx.asistencia.create).toHaveBeenCalledTimes(1);
  });
});

// ---------- T13: Progreso (HF-5, LOPDP) ----------
describe('RF-05: seguimiento del desarrollo', () => {
  function prismaFalso({ usuario, tutor, nino }) {
    return {
      $transaction: jest.fn((fn) => fn({
        $executeRawUnsafe: jest.fn(),
        progreso: { create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 1, ...data })) },
      })),
      usuario: { findUnique: jest.fn().mockResolvedValue(usuario) },
      tutor: { findUnique: jest.fn().mockResolvedValue(tutor) },
      nino: { findUnique: jest.fn().mockResolvedValue(nino) },
      progreso: { findMany: jest.fn().mockResolvedValue([{ id: 9, area: 'motor' }]) },
    };
  }

  test('rechaza un área fuera del catálogo', async () => {
    const s = crearProgresoService(prismaFalso({}));
    await expect(s.registrarProgreso({ ninoId: 1, area: 'yoga', observacion: 'x' }))
      .rejects.toThrow(ProgresoInvalidoError);
  });

  test('TUTOR puede ver el historial de SU propio hijo', async () => {
    const prisma = prismaFalso({
      usuario: { id: 7, personaId: 40 },
      tutor: { id: 4, personaId: 40, familiaId: 33 },
      nino: { id: 12, familiaId: 33 },
    });
    const s = crearProgresoService(prisma);
    const h = await s.historial(12, { rol: 'TUTOR', usuarioId: 7 });
    expect(h).toHaveLength(1);
  });

  test('TUTOR NO puede ver el historial de un niño ajeno (LOPDP) → AccesoDenegado', async () => {
    const prisma = prismaFalso({
      usuario: { id: 7, personaId: 40 },
      tutor: { id: 4, personaId: 40, familiaId: 33 },
      nino: { id: 99, familiaId: 88 }, // familia distinta
    });
    const s = crearProgresoService(prisma);
    await expect(s.historial(99, { rol: 'TUTOR', usuarioId: 7 }))
      .rejects.toThrow(AccesoDenegadoError);
  });
});

// ---------- T14: Inventario (HF-6) ----------
describe('RF-06: inventario con alertas de stock', () => {
  function prismaFalso({ material }) {
    const tx = {
      $executeRawUnsafe: jest.fn(),
      materialDidactico: {
        findUnique: jest.fn().mockResolvedValue(material),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...material, stock: data.stock })),
      },
    };
    return {
      prisma: {
        $transaction: jest.fn((fn) => fn(tx)),
        materialDidactico: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, nombre: 'Crayones', stock: 2, stockMinimo: 5 },
            { id: 2, nombre: 'Pelotas', stock: 20, stockMinimo: 5 },
          ]),
        },
      },
      tx,
    };
  }

  test('rechaza retirar más stock del disponible', async () => {
    const { prisma } = prismaFalso({ material: { id: 1, stock: 3, stockMinimo: 5 } });
    const s = crearMaterialService(prisma);
    await expect(s.registrarMovimiento({ materialId: 1, delta: -10 }))
      .rejects.toThrow(MaterialInvalidoError);
  });

  test('una salida que deja el stock bajo el mínimo marca enAlerta=true (HF-6)', async () => {
    const { prisma } = prismaFalso({ material: { id: 1, stock: 6, stockMinimo: 5 } });
    const s = crearMaterialService(prisma);
    const r = await s.registrarMovimiento({ materialId: 1, delta: -3 }); // queda 3 < 5
    expect(r.stock).toBe(3);
    expect(r.enAlerta).toBe(true);
  });

  test('alertas() devuelve solo los materiales bajo el mínimo', async () => {
    const { prisma } = prismaFalso({ material: null });
    const s = crearMaterialService(prisma);
    const a = await s.alertas();
    expect(a).toHaveLength(1);
    expect(a[0].nombre).toBe('Crayones');
  });
});
