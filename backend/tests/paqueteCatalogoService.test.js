// ============================================================
// PRUEBA UNITARIA — paqueteCatalogoService (extensión RF-01/RF-03)
// Catálogo de paquetes de la Propietaria + prueba gratis por registro.
// BD falsa inyectada (SOLID-D). Ejecutar: npm test
// ============================================================
const { crearPaqueteCatalogoService, CatalogoInvalidoError } =
  require('../src/services/paqueteCatalogoService');

function crearPrismaFalso() {
  const tx = {
    $executeRawUnsafe: jest.fn(),
    paqueteCatalogo: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, activo: true, ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 1 }),
    },
    configuracionPrueba: {
      upsert: jest.fn().mockImplementation(({ create, update }) =>
        Promise.resolve({ id: 1, habilitado: true, diasPrueba: 3, ...create, ...update })),
    },
  };
  const prisma = {
    $transaction: jest.fn((fn) => fn(tx)),
    paqueteCatalogo: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    configuracionPrueba: { findUnique: jest.fn().mockResolvedValue({ id: 1, habilitado: true, diasPrueba: 3 }) },
  };
  return { prisma, tx };
}

const paqueteValido = {
  nombre: 'Mensual 2 clases/semana', tipo: 'mensual',
  clasesPorSemana: 2, saldoClases: 8, precio: 120,
};

describe('Catálogo: crear paquete', () => {
  test('crea un paquete válido (con auditoría)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    const p = await servicio.crearPaquete(paqueteValido, 1);
    expect(p.nombre).toBe('Mensual 2 clases/semana');
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('app.usuario_id'));
  });

  test('rechaza clasesPorSemana fuera de 1–7 (regla de la entrevista)', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.crearPaquete({ ...paqueteValido, clasesPorSemana: 8 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('rechaza saldoClases menor a 1', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.crearPaquete({ ...paqueteValido, saldoClases: 0 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('rechaza nombre duplicado en el catálogo', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.paqueteCatalogo.findUnique.mockResolvedValue({ id: 9, nombre: paqueteValido.nombre });
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.crearPaquete(paqueteValido, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('rechaza precio negativo', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.crearPaquete({ ...paqueteValido, precio: -5 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('acepta duración en días (vigencia) y también sin duración (no vence)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await servicio.crearPaquete({ ...paqueteValido, duracionDias: 30 }, 1);
    expect(tx.paqueteCatalogo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ duracionDias: 30 }),
    });
    prisma.paqueteCatalogo.findUnique.mockResolvedValue(null);
    await servicio.crearPaquete({ ...paqueteValido, nombre: 'Otro' }, 1);
    expect(tx.paqueteCatalogo.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ duracionDias: null }),
    });
  });

  test('rechaza duracionDias fuera de 1–365', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.crearPaquete({ ...paqueteValido, duracionDias: 0 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
    await expect(servicio.crearPaquete({ ...paqueteValido, duracionDias: 400 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
    // al editar también se valida (el paquete debe existir para llegar ahí)
    prisma.paqueteCatalogo.findUnique.mockResolvedValue({ id: 1, ...paqueteValido });
    await expect(servicio.actualizarPaquete(1, { duracionDias: 1.5 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });
});

describe('Catálogo: editar, desactivar y eliminar', () => {
  test('desactiva un paquete (deja de ofrecerse sin borrarlo)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.paqueteCatalogo.findUnique.mockResolvedValue({ id: 1, ...paqueteValido, activo: true });
    const servicio = crearPaqueteCatalogoService(prisma);
    await servicio.actualizarPaquete(1, { activo: false }, 1);
    expect(tx.paqueteCatalogo.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { activo: false },
    });
  });

  test('rechaza editar un paquete que no existe', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.actualizarPaquete(99, { precio: 100 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('elimina un paquete del catálogo (los contratados no se afectan: sin FK)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.paqueteCatalogo.findUnique.mockResolvedValue({ id: 1, ...paqueteValido });
    const servicio = crearPaqueteCatalogoService(prisma);
    await servicio.eliminarPaquete(1, 1);
    expect(tx.paqueteCatalogo.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('Prueba gratis por registro (config editable)', () => {
  test('actualiza días y habilitado', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await servicio.actualizarConfigPrueba({ habilitado: false, diasPrueba: 5 }, 1);
    expect(tx.configuracionPrueba.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      update: { habilitado: false, diasPrueba: 5 },
    }));
  });

  test('rechaza diasPrueba fuera de 1–30', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearPaqueteCatalogoService(prisma);
    await expect(servicio.actualizarConfigPrueba({ diasPrueba: 0 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
    await expect(servicio.actualizarConfigPrueba({ diasPrueba: 45 }, 1))
      .rejects.toThrow(CatalogoInvalidoError);
  });

  test('si no hay fila de config, devuelve el default del negocio (3 días, habilitada)', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.configuracionPrueba.findUnique.mockResolvedValue(null);
    const servicio = crearPaqueteCatalogoService(prisma);
    const config = await servicio.obtenerConfigPrueba();
    expect(config).toEqual({ id: 1, habilitado: true, diasPrueba: 3 });
  });
});
