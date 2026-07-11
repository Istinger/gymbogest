// ============================================================
// PRUEBA UNITARIA — usuarioService (T22 sign up / gestión de cuentas)
// Criterio: el correo debe tener formato válido Y pertenecer a un
// proveedor conocido (gmail, hotmail, outlook, etc.) tanto al CREAR
// como al EDITAR una cuenta.
// ============================================================
const {
  crearUsuarioService, UsuarioInvalidoError, CorreoDuplicadoError, DOMINIOS_PERMITIDOS,
} = require('../src/services/usuarioService');

function crearPrismaFalso() {
  const tx = {
    $executeRawUnsafe: jest.fn(),
    persona: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 10, ...data })),
      update: jest.fn(),
    },
    usuario: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, correo: 'x@gmail.com', rol: 'TUTOR', ...data })),
    },
  };
  return {
    usuario: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
    },
    persona: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((fn) => fn(tx)),
  };
}

describe('Sign up: validación de correo por proveedor conocido', () => {
  test('acepta un correo de gmail.com', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearUsuarioService(prisma);
    const cuenta = await servicio.registrarCuenta({
      correo: 'maria.perez@gmail.com', password: 'secreto1', nombres: 'María Pérez',
    });
    expect(cuenta.rol).toBe('TUTOR');
  });

  test('acepta el dominio en mayúsculas (GMAIL.COM)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.registrarCuenta({
      correo: 'maria@GMAIL.COM', password: 'secreto1', nombres: 'María',
    })).resolves.toBeDefined();
  });

  test('rechaza un dominio desconocido (correo@empresa-x.com)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.registrarCuenta({
      correo: 'correo@empresa-x.com', password: 'secreto1', nombres: 'Alguien',
    })).rejects.toThrow(UsuarioInvalidoError);
  });

  test('rechaza un typo de proveedor (gmial.com)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.registrarCuenta({
      correo: 'maria@gmial.com', password: 'secreto1', nombres: 'María',
    })).rejects.toThrow(UsuarioInvalidoError);
  });

  test('rechaza formato inválido (sin @)', async () => {
    const prisma = crearPrismaFalso();
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.registrarCuenta({
      correo: 'no-es-correo', password: 'secreto1', nombres: 'X',
    })).rejects.toThrow(UsuarioInvalidoError);
  });

  test('rechaza correo duplicado (409)', async () => {
    const prisma = crearPrismaFalso();
    prisma.usuario.findUnique.mockResolvedValue({ id: 99, correo: 'maria@gmail.com' });
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.registrarCuenta({
      correo: 'maria@gmail.com', password: 'secreto1', nombres: 'María',
    })).rejects.toThrow(CorreoDuplicadoError);
  });
});

describe('Editar cuenta: el correo nuevo también exige proveedor conocido', () => {
  test('rechaza cambiar el correo a un dominio desconocido', async () => {
    const prisma = crearPrismaFalso();
    prisma.usuario.findUnique.mockResolvedValueOnce({
      id: 1, correo: 'vieja@gmail.com', rol: 'TUTOR', personaId: null, persona: null,
    });
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.actualizarUsuario(1, { correo: 'nueva@dominio-raro.ec' }))
      .rejects.toThrow(UsuarioInvalidoError);
  });

  test('acepta cambiar el correo a outlook.com', async () => {
    const prisma = crearPrismaFalso();
    // 1ª llamada: buscar el usuario a editar; 2ª: verificar duplicado (null)
    prisma.usuario.findUnique
      .mockResolvedValueOnce({ id: 1, correo: 'vieja@gmail.com', rol: 'TUTOR', personaId: null, persona: null })
      .mockResolvedValueOnce(null);
    const servicio = crearUsuarioService(prisma);
    await expect(servicio.actualizarUsuario(1, { correo: 'nueva@outlook.com' }))
      .resolves.toBeDefined();
  });
});

describe('Catálogo de proveedores', () => {
  test('incluye al menos gmail, hotmail y outlook', () => {
    expect(DOMINIOS_PERMITIDOS).toEqual(
      expect.arrayContaining(['gmail.com', 'hotmail.com', 'outlook.com']),
    );
  });
});
