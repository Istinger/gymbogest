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
      update: jest.fn().mockResolvedValue({ id: 50 }),
    },
    familia: {
      create: jest.fn().mockResolvedValue({ id: 7, codigo: 'FAM-7' }),
      findUnique: jest.fn().mockResolvedValue({ id: 7, codigo: 'FAM-7' }),
    },
    // Catálogo comercial (contratar copia los valores de la plantilla)
    paqueteCatalogo: {
      findUnique: jest.fn().mockResolvedValue({
        id: 2, nombre: 'Mensual 2 clases/semana', tipo: 'mensual',
        clasesPorSemana: 2, saldoClases: 8, precio: 120, activo: true,
      }),
    },
    pago: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 90, ...data })),
    },
    tutor: {
      create: jest.fn().mockResolvedValue({ id: 3 }),
      update: jest.fn().mockResolvedValue({ id: 3 }),
      findUnique: jest.fn().mockResolvedValue({ id: 3, persona: { id: 50 } }),
    },
    nino: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 20, ...data })),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 20, ...data })),
      findMany: jest.fn().mockResolvedValue([]), // hermanos de la familia (regla homónimos)
    },
    reserva: {
      findMany: jest.fn().mockResolvedValue([]), // reservas futuras al dar de baja
      update: jest.fn().mockResolvedValue({}),
    },
    paquete: {
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 80, ...data })),
    },
    // Prueba gratis por registro: habilitada, 3 días (default del negocio)
    configuracionPrueba: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, habilitado: true, diasPrueba: 3 }),
    },
  };
  const prisma = {
    $transaction: jest.fn((fn) => fn(tx)),
    persona: { findUnique: jest.fn().mockResolvedValue(null) },
    tutor: { findUnique: jest.fn().mockResolvedValue(null) },
    nino: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    paquete: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  return { prisma, tx };
}

// Cédula ecuatoriana VÁLIDA (dígito verificador correcto: 171234567 → 5)
const CEDULA_VALIDA = '1712345675';

const entradaValida = {
  nino: { nombres: 'Emma Pérez', fechaNacimiento: '2023-04-12' },
  tutor: {
    nombres: 'Laura Pérez', cedula: CEDULA_VALIDA, telefono: '0991112233',
    correo: 'laura.perez@gmail.com', parentesco: 'madre',
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

  test('la familia NUEVA recibe la prueba gratis (3 días → paquete PRUEBA_GRATIS)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.registrarFamilia(entradaValida);
    expect(r.pruebaGratis).toEqual({ dias: 3 });
    expect(tx.paquete.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipo: 'PRUEBA_GRATIS', saldoClases: 3, familiaId: 7 }),
    });
  });

  test('la prueba gratis VENCE a los N días del registro (ventana de calendario)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    await servicio.registrarFamilia(entradaValida);
    const { fechaVencimiento } = tx.paquete.create.mock.calls[0][0].data;
    const diasHastaVencer = (fechaVencimiento - new Date()) / (24 * 60 * 60 * 1000);
    expect(diasHastaVencer).toBeGreaterThan(2.9); // ≈ 3 días (config del negocio)
    expect(diasHastaVencer).toBeLessThanOrEqual(3);
  });

  test('con la prueba gratis DESHABILITADA no se crea el paquete', async () => {
    const { prisma, tx } = crearPrismaFalso();
    tx.configuracionPrueba.findUnique.mockResolvedValue({ id: 1, habilitado: false, diasPrueba: 3 });
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.registrarFamilia(entradaValida);
    expect(r.pruebaGratis).toBeNull();
    expect(tx.paquete.create).not.toHaveBeenCalled();
  });

  test('asociar un niño a familia EXISTENTE no regala otra prueba gratis', async () => {
    const { prisma, tx } = crearPrismaFalso({
      personaExistente: { id: 9, tutor: { id: 4, familiaId: 33 } },
    });
    const servicio = crearFamiliaService(prisma);
    await servicio.registrarFamilia(entradaValida);
    expect(tx.paquete.create).not.toHaveBeenCalled();
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

  test('rechaza inscribir dos niños con el mismo nombre en la misma familia', async () => {
    const { prisma, tx } = crearPrismaFalso({
      personaExistente: { id: 9, tutor: { id: 4, familiaId: 33 } },
    });
    // la familia 33 ya tiene un niño "Emma Pérez" (mismo nombre que la entrada)
    tx.nino.findMany.mockResolvedValue([{ id: 21, nombres: 'Emma Pérez', familiaId: 33 }]);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.registrarFamilia(entradaValida)).rejects.toThrow(ValidacionError);
    expect(tx.nino.create).not.toHaveBeenCalled();
  });

  test('el duplicado ignora mayúsculas y tildes ("emma perez" ≈ "Emma Pérez")', async () => {
    const { prisma, tx } = crearPrismaFalso({
      personaExistente: { id: 9, tutor: { id: 4, familiaId: 33 } },
    });
    tx.nino.findMany.mockResolvedValue([{ id: 21, nombres: 'emma perez', familiaId: 33 }]);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.registrarFamilia(entradaValida)).rejects.toThrow(ValidacionError);
  });
});

describe('CU-01: validaciones de datos', () => {
  const servicio = crearFamiliaService(crearPrismaFalso().prisma);

  test('rechaza cédula que no tenga 10 dígitos', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, cedula: '123' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza cédula con dígito verificador incorrecto (10 dígitos pero inválida)', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, cedula: '1712345678' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza correo con formato inválido', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, correo: 'no-es-correo' } };
    await expect(servicio.registrarFamilia(mala)).rejects.toThrow(ValidacionError);
  });

  test('rechaza correo de un dominio no reconocido', async () => {
    const mala = { ...entradaValida, tutor: { ...entradaValida.tutor, correo: 'laura@mail.com' } };
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

describe('Extensión CU-01: corregir typos de la inscripción', () => {
  const tutorEnBD = {
    id: 3, personaId: 50,
    persona: { id: 50, nombres: 'Laura Peres', cedula: CEDULA_VALIDA, correo: 'laura.perez@gmail.com', telefono: '0991112233' },
  };

  test('Recepción corrige el nombre y teléfono del tutor', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.tutor.findUnique.mockResolvedValue(tutorEnBD);
    const servicio = crearFamiliaService(prisma);
    await servicio.actualizarTutor(3, { nombres: 'Laura Pérez', telefono: '0999999999' }, { usuarioId: 2 });
    expect(tx.persona.update).toHaveBeenCalledWith({
      where: { id: 50 },
      data: { nombres: 'Laura Pérez', telefono: '0999999999' },
    });
    // la transacción registra quién editó (auditoría)
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('app.usuario_id'));
  });

  test('sin permitirCedula (Recepción) NO se puede cambiar la cédula', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.tutor.findUnique.mockResolvedValue(tutorEnBD);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarTutor(3, { cedula: '1710000009' }, { usuarioId: 2 }))
      .rejects.toThrow(/Solo la Propietaria/);
  });

  test('con permitirCedula (Propietaria) la cédula nueva debe ser válida', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.tutor.findUnique.mockResolvedValue(tutorEnBD);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarTutor(3, { cedula: '1799999999' }, { usuarioId: 1, permitirCedula: true }))
      .rejects.toThrow(ValidacionError);
  });

  test('el correo corregido también exige proveedor conocido', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.tutor.findUnique.mockResolvedValue(tutorEnBD);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarTutor(3, { correo: 'laura@dominio-raro.ec' }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });

  test('corrige el nombre y la fecha de nacimiento del niño', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20, nombres: 'Ema Pérez' });
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.actualizarNino(20, { nombres: 'Emma Pérez', fechaNacimiento: '2023-04-12' }, { usuarioId: 2 });
    expect(r.nombres).toBe('Emma Pérez');
    expect(tx.nino.update).toHaveBeenCalledTimes(1);
  });

  test('renombrar un niño no puede chocar con un hermano de la misma familia', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20, nombres: 'Ema Pérez', familiaId: 33 });
    prisma.nino.findMany.mockResolvedValue([
      { id: 20, nombres: 'Ema Pérez', familiaId: 33 },
      { id: 21, nombres: 'Emma Pérez', familiaId: 33 },
    ]);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarNino(20, { nombres: 'Emma Pérez' }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });

  test('da de baja (inactivo) y reactiva a un niño conservando su registro', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20, nombres: 'Emma Pérez' });
    const servicio = crearFamiliaService(prisma);
    await servicio.actualizarNino(20, { activo: false }, { usuarioId: 2 });
    expect(tx.nino.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { activo: false } });
  });

  test('la baja cancela las reservas ACTIVAS de clases FUTURAS y devuelve el saldo', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20, nombres: 'Emma Pérez' });
    tx.reserva.findMany.mockResolvedValue([
      { id: 70, paqueteId: 5, estado: 'ACTIVA' },
      { id: 71, paqueteId: 5, estado: 'ACTIVA' },
    ]);
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.actualizarNino(20, { activo: false }, { usuarioId: 2 });

    // solo clases futuras: el where filtra por fechaHora > ahora
    expect(tx.reserva.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        ninoId: 20,
        estado: 'ACTIVA',
        clase: { fechaHora: { gt: expect.any(Date) } },
      }),
    });
    expect(tx.reserva.update).toHaveBeenCalledTimes(2);
    expect(tx.reserva.update).toHaveBeenCalledWith({ where: { id: 70 }, data: { estado: 'CANCELADA' } });
    // el saldo vuelve al paquete (1 por reserva cancelada)
    expect(tx.paquete.update).toHaveBeenCalledTimes(2);
    expect(tx.paquete.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { saldoClases: { increment: 1 } },
    });
    expect(r.reservasCanceladas).toBe(2);
  });

  test('reactivar a un niño NO toca sus reservas', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20, nombres: 'Emma Pérez' });
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.actualizarNino(20, { activo: true }, { usuarioId: 2 });
    expect(tx.reserva.findMany).not.toHaveBeenCalled();
    expect(tx.reserva.update).not.toHaveBeenCalled();
    expect(r.reservasCanceladas).toBe(0);
  });

  test('rechaza un valor no booleano en activo', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20 });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarNino(20, { activo: 'no' }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });

  test('rechaza fecha de nacimiento inválida al editar', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.nino.findUnique.mockResolvedValue({ id: 20 });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.actualizarNino(20, { fechaNacimiento: 'no-es-fecha' }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });
});

describe('Extensión RF-03: contratar paquete del catálogo (Recepción vende)', () => {
  test('copia tipo, clases/semana y saldo de la plantilla (Recepción no los inventa)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.contratarPaquete(7, { paqueteCatalogoId: 2 }, { usuarioId: 2 });
    expect(tx.paquete.create).toHaveBeenCalledWith({
      data: {
        tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8,
        fechaVencimiento: null, // la plantilla no define duración → no vence
        familiaId: 7,
      },
    });
    expect(r.pago).toBeNull(); // pago opcional: sin conPago no se cobra
    expect(tx.pago.create).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('app.usuario_id'));
  });

  test('con conPago registra el Pago con el precio del catálogo en la misma transacción', async () => {
    const { prisma, tx } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.contratarPaquete(7, { paqueteCatalogoId: 2, conPago: true }, { usuarioId: 2 });
    expect(tx.pago.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ familiaId: 7, monto: 120 }),
    });
    expect(r.pago.numeroComprobante).toMatch(/^DTL-/); // comprobante Dátil (mock)
  });

  test('rechaza contratar una plantilla INACTIVA (ya no se ofrece)', async () => {
    const { prisma, tx } = crearPrismaFalso();
    tx.paqueteCatalogo.findUnique.mockResolvedValue({ id: 2, activo: false });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.contratarPaquete(7, { paqueteCatalogoId: 2 }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
    expect(tx.paquete.create).not.toHaveBeenCalled();
  });

  test('rechaza contratar si la plantilla o la familia no existen', async () => {
    const { prisma, tx } = crearPrismaFalso();
    tx.paqueteCatalogo.findUnique.mockResolvedValue(null);
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.contratarPaquete(7, { paqueteCatalogoId: 99 }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);

    tx.familia.findUnique.mockResolvedValue(null);
    await expect(servicio.contratarPaquete(999, { paqueteCatalogoId: 2 }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });

  test('si la plantilla define duración, el paquete vence hoy + duracionDias', async () => {
    const { prisma, tx } = crearPrismaFalso();
    tx.paqueteCatalogo.findUnique.mockResolvedValue({
      id: 2, tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8,
      precio: 120, duracionDias: 30, activo: true,
    });
    const servicio = crearFamiliaService(prisma);
    await servicio.contratarPaquete(7, { paqueteCatalogoId: 2 }, { usuarioId: 2 });
    const { fechaVencimiento } = tx.paquete.create.mock.calls[0][0].data;
    const diasHastaVencer = (fechaVencimiento - new Date()) / (24 * 60 * 60 * 1000);
    expect(diasHastaVencer).toBeGreaterThan(29.9);
    expect(diasHastaVencer).toBeLessThanOrEqual(30);
  });

  test('rechaza conPago si la plantilla no tiene precio en el catálogo', async () => {
    const { prisma, tx } = crearPrismaFalso();
    tx.paqueteCatalogo.findUnique.mockResolvedValue({
      id: 2, tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8, precio: null, activo: true,
    });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.contratarPaquete(7, { paqueteCatalogoId: 2, conPago: true }, { usuarioId: 2 }))
      .rejects.toThrow(ValidacionError);
  });
});

describe('Extensión RF-03: ajuste manual del paquete (solo Propietaria)', () => {
  test('la Propietaria ajusta el saldo y queda auditado', async () => {
    const { prisma, tx } = crearPrismaFalso();
    prisma.paquete.findUnique.mockResolvedValue({ id: 5, saldoClases: 3 });
    tx.paquete.update.mockResolvedValue({ id: 5, saldoClases: 6 });
    const servicio = crearFamiliaService(prisma);
    const r = await servicio.ajustarPaquete(5, { saldoClases: 6 }, { usuarioId: 1 });
    expect(tx.paquete.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { saldoClases: 6 } });
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('app.usuario_id'));
    expect(r.saldoClases).toBe(6);
  });

  test('rechaza saldo negativo o no entero', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.paquete.findUnique.mockResolvedValue({ id: 5, saldoClases: 3 });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.ajustarPaquete(5, { saldoClases: -1 }, { usuarioId: 1 }))
      .rejects.toThrow(ValidacionError);
    await expect(servicio.ajustarPaquete(5, { saldoClases: 2.5 }, { usuarioId: 1 }))
      .rejects.toThrow(ValidacionError);
  });

  test('rechaza clasesPorSemana fuera de 1–7 y el ajuste vacío', async () => {
    const { prisma } = crearPrismaFalso();
    prisma.paquete.findUnique.mockResolvedValue({ id: 5 });
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.ajustarPaquete(5, { clasesPorSemana: 8 }, { usuarioId: 1 }))
      .rejects.toThrow(ValidacionError);
    await expect(servicio.ajustarPaquete(5, {}, { usuarioId: 1 }))
      .rejects.toThrow(ValidacionError);
  });

  test('rechaza ajustar un paquete que no existe', async () => {
    const { prisma } = crearPrismaFalso();
    const servicio = crearFamiliaService(prisma);
    await expect(servicio.ajustarPaquete(99, { saldoClases: 5 }, { usuarioId: 1 }))
      .rejects.toThrow(ValidacionError);
  });
});
