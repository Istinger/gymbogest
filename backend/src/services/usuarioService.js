// ============================================================
// services/usuarioService.js
// RNF-01 — Gestión de cuentas de usuario (T22, panel Propietaria)
// - Sign up público: crea cuenta con rol TUTOR por defecto; si ya
//   existe una Persona con ese correo (inscrita por Recepción), la
//   cuenta queda vinculada y el tutor ve a sus hijos de inmediato.
// - La PROPIETARIA administra cuentas: crear con cualquier rol,
//   cambiar rol, correo, contraseña y nombre.
// SOLID-D: recibe prisma inyectado (crearUsuarioService(prisma)).
// ============================================================
const bcrypt = require('bcryptjs');

class UsuarioInvalidoError extends Error {}
class CorreoDuplicadoError extends Error {}
class RolProtegidoError extends Error {}

const ROLES = ['ADMIN', 'PROPIETARIA', 'RECEPCION', 'EDUCADORA', 'TUTOR'];
// PROPIETARIA y ADMIN son roles protegidos: no se asignan ni se quitan desde
// la gestión de cuentas (evita perder el acceso administrativo por accidente)
const ROLES_PROTEGIDOS = ['ADMIN', 'PROPIETARIA'];
const ROLES_ASIGNABLES = ['RECEPCION', 'EDUCADORA', 'TUTOR'];

// Validaciones compartidas con familiaService (mismo criterio en cuentas e inscripciones)
const { DOMINIOS_PERMITIDOS, motivoCorreoInvalido, esCedulaEcuatorianaValida } =
  require('./validaciones');

function validarCorreo(correo) {
  const motivo = motivoCorreoInvalido(correo);
  if (motivo) throw new UsuarioInvalidoError(motivo);
}

function validarPassword(password) {
  if (!password || password.length < 6) {
    throw new UsuarioInvalidoError('La contraseña debe tener al menos 6 caracteres');
  }
}

function crearUsuarioService(prisma) {
  // Sign up público — rol TUTOR fijo (la Propietaria eleva roles después)
  async function registrarCuenta({ correo, password, nombres }) {
    validarCorreo(correo);
    validarPassword(password);
    if (!nombres?.trim()) throw new UsuarioInvalidoError('El nombre es obligatorio');

    const existente = await prisma.usuario.findUnique({ where: { correo } });
    if (existente) throw new CorreoDuplicadoError('Ya existe una cuenta con ese correo');

    // Vincular con la Persona inscrita por Recepción (mismo correo), si existe
    // y aún no tiene cuenta — así el tutor ve a sus hijos al entrar.
    const persona = await prisma.persona.findFirst({
      where: { correo, usuario: null },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { correo, passwordHash, rol: 'TUTOR', personaId: persona?.id ?? null },
    });
    return { id: usuario.id, correo: usuario.correo, rol: usuario.rol, vinculado: !!persona };
  }

  async function listarUsuarios() {
    return prisma.usuario.findMany({
      select: {
        id: true, correo: true, rol: true, creadoEn: true,
        persona: { select: { id: true, nombres: true, cedula: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  // Solo ADMIN: crear cuenta con rol operativo (p. ej. educadoras)
  async function crearUsuario({ correo, password, rol, nombres, cedula, telefono }, adminId) {
    validarCorreo(correo);
    validarPassword(password);
    if (ROLES_PROTEGIDOS.includes(rol)) {
      throw new RolProtegidoError(`El rol ${rol} está protegido y no puede asignarse desde la gestión de cuentas`);
    }
    if (!ROLES_ASIGNABLES.includes(rol)) {
      throw new UsuarioInvalidoError(`rol debe ser uno de: ${ROLES_ASIGNABLES.join(', ')}`);
    }
    const existente = await prisma.usuario.findUnique({ where: { correo } });
    if (existente) throw new CorreoDuplicadoError('Ya existe una cuenta con ese correo');

    let persona = await prisma.persona.findFirst({ where: { correo, usuario: null } });

    // Sin persona previa: crearla para que la cuenta tenga nombre visible.
    // El nombre vive en Persona (herencia del diagrama de clases) y Persona
    // exige cédula única, por eso se piden ambos al crear desde el panel.
    if (!persona && nombres?.trim()) {
      if (!esCedulaEcuatorianaValida(cedula)) {
        throw new UsuarioInvalidoError('Para registrar el nombre se necesita una cédula ecuatoriana válida (10 dígitos, dígito verificador correcto)');
      }
      const cedulaOcupada = await prisma.persona.findUnique({ where: { cedula } });
      if (cedulaOcupada) throw new CorreoDuplicadoError('Ya existe una persona con esa cédula');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.$transaction(async (tx) => {
      if (adminId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(adminId)}'`);
      }
      if (!persona && nombres?.trim()) {
        persona = await tx.persona.create({
          data: { nombres, cedula, telefono: telefono || '', correo },
        });
      } else if (persona && nombres?.trim()) {
        await tx.persona.update({ where: { id: persona.id }, data: { nombres } });
      }
      const usuario = await tx.usuario.create({
        data: { correo, passwordHash, rol, personaId: persona?.id ?? null },
      });
      return { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
    });
  }

  // Solo ADMIN: cambiar rol, correo, contraseña y/o nombre
  async function actualizarUsuario(id, { correo, password, rol, nombres, cedula, telefono }, adminId) {
    const usuario = await prisma.usuario.findUnique({ where: { id }, include: { persona: true } });
    if (!usuario) throw new UsuarioInvalidoError('El usuario no existe');

    const data = {};
    if (correo !== undefined) {
      validarCorreo(correo);
      const otro = await prisma.usuario.findUnique({ where: { correo } });
      if (otro && otro.id !== id) throw new CorreoDuplicadoError('Ya existe una cuenta con ese correo');
      data.correo = correo;
    }
    if (password !== undefined && password !== '') {
      validarPassword(password);
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    if (rol !== undefined && rol !== usuario.rol) {
      // El rol de PROPIETARIA/ADMIN no se toca, ni se asciende a nadie a ellos
      if (ROLES_PROTEGIDOS.includes(usuario.rol)) {
        throw new RolProtegidoError(`El rol de la cuenta ${usuario.rol} está protegido y no puede cambiarse`);
      }
      if (ROLES_PROTEGIDOS.includes(rol)) {
        throw new RolProtegidoError(`El rol ${rol} está protegido y no puede asignarse desde la gestión de cuentas`);
      }
      if (!ROLES_ASIGNABLES.includes(rol)) {
        throw new UsuarioInvalidoError(`rol debe ser uno de: ${ROLES_ASIGNABLES.join(', ')}`);
      }
      data.rol = rol;
    }

    // Cuenta sin Persona + nombre nuevo: crearla (necesita cédula, ver crearUsuario)
    const crearPersona = nombres?.trim() && !usuario.personaId;
    if (crearPersona) {
      if (!esCedulaEcuatorianaValida(cedula)) {
        throw new UsuarioInvalidoError('Para registrar el nombre se necesita una cédula ecuatoriana válida (10 dígitos, dígito verificador correcto)');
      }
      const cedulaOcupada = await prisma.persona.findUnique({ where: { cedula } });
      if (cedulaOcupada) throw new CorreoDuplicadoError('Ya existe una persona con esa cédula');
    }

    return prisma.$transaction(async (tx) => {
      if (adminId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(adminId)}'`);
      }
      if (crearPersona) {
        const persona = await tx.persona.create({
          data: { nombres, cedula, telefono: telefono || '', correo: correo || usuario.correo },
        });
        data.personaId = persona.id;
      } else if (nombres?.trim() && usuario.personaId) {
        await tx.persona.update({ where: { id: usuario.personaId }, data: { nombres } });
      }
      const actualizado = await tx.usuario.update({ where: { id }, data });
      return { id: actualizado.id, correo: actualizado.correo, rol: actualizado.rol };
    });
  }

  // Bitácora de ingresos (login) — panel ADMIN
  async function listarAccesos({ limite = 100 } = {}) {
    return prisma.logAcceso.findMany({
      orderBy: { fecha: 'desc' },
      take: Number(limite),
    });
  }

  async function registrarAcceso({ correo, exito, ip }) {
    // best-effort: un fallo al escribir el log nunca debe romper el login
    try {
      await prisma.logAcceso.create({ data: { correo: correo || '(vacío)', exito, ip } });
    } catch { /* noop */ }
  }

  return {
    registrarCuenta, listarUsuarios, crearUsuario, actualizarUsuario,
    listarAccesos, registrarAcceso,
  };
}

module.exports = {
  crearUsuarioService, UsuarioInvalidoError, CorreoDuplicadoError, RolProtegidoError,
  ROLES, ROLES_ASIGNABLES, DOMINIOS_PERMITIDOS,
};
