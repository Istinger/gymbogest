// ============================================================
// PRUEBA UNITARIA — familiaService (HF-1 / RF-01 / CU-01)
// Casos = criterios de aceptación de HF-1 (spec.md):
//   - crea Familia + Nino + Tutor(Persona) en una sola operación
//   - cédula ya existente → asocia el niño, NO duplica (CU-01 exc. 6)
//   - campos obligatorios y formatos validados (cédula 10 dígitos, correo)
// BD falsa inyectada (SOLID-D). Ejecutar: npm test
// ============================================================
const { crearFamiliaService, ValidacionError } = require('../src/services/familiaService');

function crearPrismaFalso({ personaExistente = null } = {}) {
  const tx = {
    $executeRawUnsafe: jest.fn(),
    persona: {
      findUnique: jest.fn().mockResolvedValue(personaExistente),
      create: jest.fn().mockResolvedValue({ id: 50 }),
    },
    familia: { create: jest.fn().mockResolvedValue({ id: 7, codigo: 'FAM-7' }) },
    tutor: { create: jest.fn().mockResolvedValue({ id: 3 }) },
    nino: { create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 20, ...data })) },
  };
  const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
  return { prisma, tx };
}

const entradaValida = {
  nino: { nombres: 'Emma Pérez', fechaNacimiento: '2023-04-12' },
  tutor: {
    nombres: 'Laura Pérez', cedula: '1712345678', telefono: '0991112233',
    correo: 'laura@mail.com', parentesco: 'madre',
  },
  canalOrigen: 'PEDIATRA_ALIADO',
  usuarioId: 2,
};

describe('RF-01: registrar familia (flujo normal, T04)', () => {
  test('crea Familia + Persona + Tutor + Nino y devuelve el código', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.registrarFamilia(entradaValida);
    expect(r.asociado).toBe(false);
    expect(r.codigo).toBe('FAM-7');
    expect(tx.familia.create).toHaveBeenCalledTimes(1);
    expect(tx.persona.create).toHaveBeenCalledTimes(1);
    expect(tx.tutor.create).toHaveBeenCalledTimes(1);
    expect(tx.nino.create).toHaveBeenCalledTimes(1);
    // el canal de origen se guarda (mide la estrategia MAX-MAX)
    expect(tx.familia.create).toHaveBeenCalledWith({ data: { canalOrigen: 'PEDIATRA_ALIADO' } });
  });
});

describe('CU-01 exc. 6: cédula duplicada (T05)', () => {
  test('si el tutor ya existe, asocia el niño a su familia y NO crea familia nueva', async () => {
    const { prisma, tx } = crearPrismaFalso({
      personaExistente: { id: 9, tutor: { id: 4, familiaId: 33 } },
    });
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.registrarFamilia(entradaValida);
    expect(r.asociado).toBe(true);
    expect(r.familiaId).toBe(33);
    expect(tx.familia.create).not.toHaveBeenCalled();   // NO duplica
    expect(tx.persona.create).not.toHaveBeenCalled();
    expect(tx.nino.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ familiaId: 33 }),
    }));
  });
});

describe('CU-01: validaciones de datos', () => {
  const servicio = crearFamiliaService(crearPrismaFalso().prisma);

  test('rechaza cédula que no tenga 10 dígitos', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, cedula: '123' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza correo con formato inválido', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, correo: 'no-es-correo' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza canalOrigen fuera del catálogo', async () => {
    const mala = { ...entradaValida, canalOrigen: 'TIKTOK' };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza si faltan campos obligatorios', async () => {
    const mala = { ...entradaValida, nino: { nombres: '' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });
});
