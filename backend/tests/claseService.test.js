// ============================================================
// PRUEBA UNITARIA — claseService (RF-02 / HF-2, Fase 2: T07)
// Criterio de aceptación: cupoMaximo por defecto = 9, nunca editable
// por encima de 9 (regla de negocio de la entrevista, Avance 1).
// ============================================================
const { crearClaseService, ValidacionClaseError } = require('../src/services/claseService');

function crearPrismaFalso() {
  return {
    clase: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
}

describe('RF-02: crear clase con cupo por defecto', () => {
  test('si no se especifica cupoMaximo, usa 9 por defecto', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    const clase = await servicio.crearClase({
      programa: 'PLAY_LEARN', fechaHora: '2026-08-01T10:00:00', empleadoId: 1,
    });
    expect(clase.cupoMaximo).toBe(9);
  });

  test('rechaza cupoMaximo mayor a 9 (regla de negocio)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await expect(servicio.crearClase({
      programa: 'MUSIC', fechaHora: '2026-08-01T10:00:00', cupoMaximo: 15, empleadoId: 1,
    })).rejects.toThrow(ValidacionClaseError);
  });

  test('rechaza un programa fuera del catálogo', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await expect(servicio.crearClase({
      programa: 'YOGA', fechaHora: '2026-08-01T10:00:00', empleadoId: 1,
    })).rejects.toThrow(ValidacionClaseError);
  });

  test('rechaza fechaHora inválida', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await expect(servicio.crearClase({
      programa: 'ART', fechaHora: 'no-es-fecha', empleadoId: 1,
    })).rejects.toThrow(ValidacionClaseError);
  });
});

describe('RNF-01: autorización a nivel de dato al listar clases', () => {
  test('con empleadoId filtra solo las clases de esa educadora', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await servicio.listarClases({ empleadoId: 7 });
    const where = prisma.clase.findMany.mock.calls[0][0].where;
    expect(where.empleadoId).toBe(7);
  });

  test('sin empleadoId no aplica el filtro (Recepción/Propietaria ven todas)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await servicio.listarClases({});
    const where = prisma.clase.findMany.mock.calls[0][0].where;
    expect(where.empleadoId).toBeUndefined();
  });
});

describe('RF-02: actualizar clase respeta el tope de cupo', () => {
  test('rechaza subir el cupo por encima de 9 al editar', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    await expect(servicio.actualizarClase(1, { cupoMaximo: 10 }))
      .rejects.toThrow(ValidacionClaseError);
  });

  test('permite bajar el cupo (ej. a 6, por espacio del aula)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearClaseService(prisma);
    const r = await servicio.actualizarClase(1, { cupoMaximo: 6 });
    expect(r.cupoMaximo).toBe(6);
  });
});
