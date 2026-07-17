// ============================================================
// PRUEBA UNITARIA — Fase 4 (T15 indicadores, T16 corporativo, T17 pagos)
// BD falsa inyectada (SOLID-D). Ejecutar: npm test
// ============================================================
const { crearIndicadorService } = require('../src/services/indicadorService');
const {
  crearCorporativoService,
  CorporativoInvalidoError,
  CorporativoNoEncontradoError,
} = require('../src/services/corporativoService');
const { crearPagoService, PagoInvalidoError } = require('../src/services/pagoService');

// ---------- T15: Indicadores (RF-07) ----------
describe('RF-07: indicadores reales — mide la estrategia MAX-MAX', () => {
  test('inscripcionesPorCanal agrupa correctamente por canalOrigen', async () => {
    const prisma = {
      familia: {
        groupBy: jest.fn().mockResolvedValue([
          { canalOrigen: 'PEDIATRA_ALIADO', _count: { _all: 5 } },
          { canalOrigen: 'REDES', _count: { _all: 12 } },
        ]),
      },
    };
    const s = crearIndicadorService(prisma);
    const r = await s.inscripcionesPorCanal();
    expect(r).toEqual([
      { canal: 'PEDIATRA_ALIADO', total: 5 },
      { canal: 'REDES', total: 12 },
    ]);
  });

  test('conversionClasePrueba calcula la tasa correctamente', async () => {
    const prisma = {
      asistencia: {
        findMany: jest.fn().mockResolvedValue([{ ninoId: 1 }, { ninoId: 2 }, { ninoId: 3 }, { ninoId: 4 }]),
      },
      reserva: {
        findMany: jest.fn().mockResolvedValue([{ ninoId: 1 }, { ninoId: 2 }]), // 2 de 4 se convirtieron
      },
    };
    const s = crearIndicadorService(prisma);
    const r = await s.conversionClasePrueba();
    expect(r).toEqual({ probaron: 4, convertidos: 2, tasaConversion: 0.5 });
  });

  test('conversionClasePrueba sin datos devuelve ceros (no divide entre 0)', async () => {
    const prisma = { asistencia: { findMany: jest.fn().mockResolvedValue([]) } };
    const s = crearIndicadorService(prisma);
    const r = await s.conversionClasePrueba();
    expect(r).toEqual({ probaron: 0, convertidos: 0, tasaConversion: 0 });
  });

  test('ninosActivos cuenta niños distintos con reserva ACTIVA', async () => {
    const prisma = {
      reserva: {
        findMany: jest.fn().mockResolvedValue([{ ninoId: 1 }, { ninoId: 2 }, { ninoId: 3 }]),
      },
    };
    const s = crearIndicadorService(prisma);
    expect(await s.ninosActivos()).toBe(3);
  });
});

// ---------- T16: Servicios corporativos (RF-08) ----------
describe('RF-08: servicios corporativos On The Go', () => {
  function prismaFalso() {
    return {
      eventoCorporativo: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      },
    };
  }

  test('rechaza una solicitud sin empresa', async () => {
    const s = crearCorporativoService(prismaFalso());
    await expect(s.registrarSolicitud({ fecha: '2026-09-01', numNinos: 10 }))
      .rejects.toThrow(CorporativoInvalidoError);
  });

  test('registra la solicitud en estado SOLICITADO', async () => {
    const s = crearCorporativoService(prismaFalso());
    const r = await s.registrarSolicitud({
      empresa: 'Constructora XYZ', contacto: 'ana@xyz.com', fecha: '2026-09-01', numNinos: 15,
    });
    expect(r.estado).toBe('SOLICITADO');
  });

  test('asignar educadora cambia el estado a CONFIRMADO', async () => {
    const s = crearCorporativoService(prismaFalso());
    const r = await s.asignarEducadora(1, 4);
    expect(r.estado).toBe('CONFIRMADO');
    expect(r.educadoraId).toBe(4);
  });

  test('rechaza un estado fuera del catálogo', async () => {
    const s = crearCorporativoService(prismaFalso());
    await expect(s.cambiarEstado(1, 'PENDIENTE')).rejects.toThrow(CorporativoInvalidoError);
  });

  // --- T28: tipo EMPRESA | PARTICULAR + edición de solicitudes ---

  test('rechaza un tipo fuera del catálogo', async () => {
    const s = crearCorporativoService(prismaFalso());
    await expect(s.registrarSolicitud({
      empresa: 'Familia Paredes', contacto: '099', fecha: '2026-09-01', numNinos: 3, tipo: 'GUBERNAMENTAL',
    })).rejects.toThrow(CorporativoInvalidoError);
  });

  test('sin tipo explícito la solicitud queda como EMPRESA (retrocompatible)', async () => {
    const s = crearCorporativoService(prismaFalso());
    const r = await s.registrarSolicitud({
      empresa: 'Constructora XYZ', contacto: 'ana@xyz.com', fecha: '2026-09-01', numNinos: 15,
    });
    expect(r.tipo).toBe('EMPRESA');
  });

  test('registra una solicitud PARTICULAR (clase privada de una familia)', async () => {
    const s = crearCorporativoService(prismaFalso());
    const r = await s.registrarSolicitud({
      empresa: 'Familia Paredes', contacto: '0991234567', fecha: '2026-09-01', numNinos: 3, tipo: 'PARTICULAR',
    });
    expect(r.tipo).toBe('PARTICULAR');
    expect(r.estado).toBe('SOLICITADO');
  });

  test('edita los datos de una solicitud', async () => {
    const prisma = prismaFalso();
    prisma.eventoCorporativo.findUnique = jest.fn().mockResolvedValue({ id: 1, estado: 'SOLICITADO' });
    const s = crearCorporativoService(prisma);
    const r = await s.editarSolicitud(1, {
      empresa: 'Banco ABC', contacto: 'rh@abc.com', fecha: '2026-10-05', numNinos: 20, tipo: 'EMPRESA',
    });
    expect(r.empresa).toBe('Banco ABC');
    expect(r.numNinos).toBe(20);
  });

  test('permite editar también un evento EJECUTADO o CANCELADO (corrección de datos)', async () => {
    for (const estado of ['EJECUTADO', 'CANCELADO']) {
      const prisma = prismaFalso();
      prisma.eventoCorporativo.findUnique = jest.fn().mockResolvedValue({ id: 1, estado });
      const s = crearCorporativoService(prisma);
      const r = await s.editarSolicitud(1, {
        empresa: 'Banco ABC', contacto: 'rh@abc.com', fecha: '2026-10-05', numNinos: 20,
      });
      expect(r.empresa).toBe('Banco ABC');
    }
  });

  test('rechaza editar un evento inexistente', async () => {
    const prisma = prismaFalso();
    prisma.eventoCorporativo.findUnique = jest.fn().mockResolvedValue(null);
    const s = crearCorporativoService(prisma);
    await expect(s.editarSolicitud(99, {
      empresa: 'Banco ABC', contacto: 'rh@abc.com', fecha: '2026-10-05', numNinos: 20,
    })).rejects.toThrow(CorporativoNoEncontradoError);
  });
});

// ---------- T17: Pagos (mock Dátil) ----------
describe('T17: registrar pago con mock de Dátil', () => {
  function prismaFalso({ familia }) {
    const tx = {
      $executeRawUnsafe: jest.fn(),
      familia: { findUnique: jest.fn().mockResolvedValue(familia) },
      pago: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })) },
    };
    return { $transaction: jest.fn((fn) => fn(tx)) };
  }

  test('rechaza monto <= 0', async () => {
    const s = crearPagoService(prismaFalso({ familia: { id: 1 } }));
    await expect(s.registrarPago({ familiaId: 1, monto: 0 })).rejects.toThrow(PagoInvalidoError);
  });

  test('rechaza si la familia no existe', async () => {
    const s = crearPagoService(prismaFalso({ familia: null }));
    await expect(s.registrarPago({ familiaId: 99, monto: 50 })).rejects.toThrow(PagoInvalidoError);
  });

  test('genera un numeroComprobante del mock Dátil', async () => {
    const s = crearPagoService(prismaFalso({ familia: { id: 1 } }));
    const r = await s.registrarPago({ familiaId: 1, monto: 80 });
    expect(r.numeroComprobante).toMatch(/^DTL-\d+-1$/);
    expect(r.monto).toBe(80);
  });
});
