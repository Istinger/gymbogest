// ============================================================
// services/familiaService.js
// RF-01 / CU-01 — Registrar niño y tutor (HF-1)
// Implementa el DIAGRAMA DE SECUENCIA 1 del Avance 6:
//   2: registrarFamilia(datos)   3: validarDatos() [interno]
//   4: verificarExistencia(cédula)   6: guardarExpediente()
//
// T05 (CU-01, excepción paso 6): si la cédula del tutor YA existe,
// NO se duplica la familia — el niño se asocia a la familia existente.
//
// SOLID-D: recibe prisma inyectado (crearFamiliaService(prisma)).
// ============================================================

class ValidacionError extends Error {}

const CANALES = ['REDES', 'PEDIATRA_ALIADO', 'EMPRESA', 'REFERIDO'];
const PARENTESCOS = ['padre', 'madre', 'abuelo', 'abuela', 'otro'];

// HF-1: el centro atiende estimulación temprana de 0 a 6 años.
// La elegibilidad termina en el 7º cumpleaños (un niño de 6 años SÍ entra).
const EDAD_MAXIMA_ANIOS = 7;

// Validaciones compartidas con usuarioService (mismo criterio en cuentas e inscripciones)
const { motivoCorreoInvalido, esCedulaEcuatorianaValida } = require('./validaciones');
// Mock Dátil compartido con pagoService (contratar paquete con pago opcional)
const { emitirComprobanteDatil } = require('./pagoService');

// Comparación de nombres sin mayúsculas ni tildes ("Emilia" ≈ "emilía")
const normalizarNombre = (n) =>
  (n || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Edad en años CUMPLIDOS a una fecha de referencia (no usa promedios de días:
// resta calendario, para que el 6º cumpleaños caiga en el día exacto).
function edadEnAnios(fechaNacimiento, hoy = new Date()) {
  let anios = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) anios--;
  return anios;
}

// HF-1: rango de edad 0–6 años. Compartido por registrarFamilia() y
// actualizarNino() — si solo se validara al registrar, el rango se podría
// evadir corrigiendo la fecha después (extensión CU-01).
function validarFechaNacimiento(valor) {
  if (isNaN(Date.parse(valor))) {
    throw new ValidacionError('fechaNacimiento no es una fecha válida');
  }
  const nacimiento = new Date(valor);
  const hoy = new Date();
  if (nacimiento > hoy) {
    throw new ValidacionError(
      'La fecha de nacimiento no puede ser futura');
  }
  const edad = edadEnAnios(nacimiento, hoy);
  if (edad >= EDAD_MAXIMA_ANIOS) {
    throw new ValidacionError(
      `El niño tiene ${edad} años. El centro atiende niños de 0 a 6 años `
      + '(la inscripción es posible hasta el día antes de cumplir 7).');
  }
  return nacimiento;
}

// Regla: una familia no puede tener dos niños con el mismo nombre
async function buscarHermanoHomonimo(clienteDb, familiaId, nombres, exceptoNinoId = null) {
  const hermanos = await clienteDb.nino.findMany({ where: { familiaId } });
  const objetivo = normalizarNombre(nombres);
  return hermanos.find((h) =>
    h.id !== exceptoNinoId && normalizarNombre(h.nombres) === objetivo) || null;
}

// 3: validarDatos() — validaciones de formato (CU-01, excepción paso 6b)
function validarDatos({ nino, tutor, canalOrigen }) {
  const faltantes = [];
  if (!nino?.nombres) faltantes.push('nino.nombres');
  if (!nino?.fechaNacimiento) faltantes.push('nino.fechaNacimiento');
  if (!tutor?.nombres) faltantes.push('tutor.nombres');
  if (!tutor?.cedula) faltantes.push('tutor.cedula');
  if (!tutor?.telefono) faltantes.push('tutor.telefono');
  if (!tutor?.correo) faltantes.push('tutor.correo');
  if (!tutor?.parentesco) faltantes.push('tutor.parentesco');
  if (!canalOrigen) faltantes.push('canalOrigen');
  if (faltantes.length) {
    throw new ValidacionError(`Campos obligatorios faltantes: ${faltantes.join(', ')}`);
  }
  if (!esCedulaEcuatorianaValida(tutor.cedula)) {
    throw new ValidacionError('La cédula no es una cédula ecuatoriana válida (verifica los 10 dígitos)');
  }
  const motivoCorreo = motivoCorreoInvalido(tutor.correo);
  if (motivoCorreo) throw new ValidacionError(motivoCorreo);
  if (!CANALES.includes(canalOrigen)) {
    throw new ValidacionError(`canalOrigen debe ser uno de: ${CANALES.join(', ')}`);
  }
  // HF-1: fecha válida, no futura y dentro del rango 0–6 años
  validarFechaNacimiento(nino.fechaNacimiento);
}

function crearFamiliaService(prisma) {
  // T04 + T05: registrar familia completa (o asociar a existente)
  async function registrarFamilia({ nino, tutor, canalOrigen, usuarioId }) {
    validarDatos({ nino, tutor, canalOrigen });

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }

      // 4: verificarExistencia(cédula)
      const personaExistente = await tx.persona.findUnique({
        where: { cedula: tutor.cedula },
        include: { tutor: true },
      });

      // T05 · CU-01 exc. 6: la cédula ya existe → asociar, no duplicar
      if (personaExistente?.tutor) {
        // Un solo tutor no puede tener dos niños con el mismo nombre
        const homonimo = await buscarHermanoHomonimo(
          tx, personaExistente.tutor.familiaId, nino.nombres,
        );
        if (homonimo) {
          throw new ValidacionError(
            `Esta familia ya tiene registrado un niño llamado "${homonimo.nombres}". `
            + 'Si es otro niño, diferencia el nombre (p. ej. con el segundo nombre).');
        }
        const ninoNuevo = await tx.nino.create({
          data: {
            nombres: nino.nombres,
            fechaNacimiento: new Date(nino.fechaNacimiento),
            observacionSalud: nino.observacionSalud || null,
            familiaId: personaExistente.tutor.familiaId,
          },
        });
        return {
          asociado: true,
          mensaje: 'El tutor ya estaba registrado; el niño se asoció a su familia existente',
          familiaId: personaExistente.tutor.familiaId,
          nino: ninoNuevo,
        };
      }

      // 6: guardarExpediente() — familia nueva completa
      const familia = await tx.familia.create({ data: { canalOrigen } });

      // si la persona existe pero no era tutor (p. ej. una empleada que inscribe a su hijo)
      const persona = personaExistente || await tx.persona.create({
        data: {
          nombres: tutor.nombres,
          cedula: tutor.cedula,
          telefono: tutor.telefono,
          correo: tutor.correo,
        },
      });

      await tx.tutor.create({
        data: { personaId: persona.id, parentesco: tutor.parentesco, familiaId: familia.id },
      });

      const ninoNuevo = await tx.nino.create({
        data: {
          nombres: nino.nombres,
          fechaNacimiento: new Date(nino.fechaNacimiento),
          observacionSalud: nino.observacionSalud || null,
          familiaId: familia.id,
        },
      });

      // Prueba gratis por registro (config editable por la Propietaria):
      // toda familia NUEVA recibe un paquete PRUEBA_GRATIS con 1 clase de
      // prueba por día configurado (3 por defecto). Solo familias nuevas —
      // asociar otro niño a una familia existente no regala otra prueba.
      const configPrueba = await tx.configuracionPrueba.findUnique({ where: { id: 1 } });
      let pruebaGratis = null;
      if (configPrueba?.habilitado ?? true) {
        const dias = configPrueba?.diasPrueba ?? 3;
        // Vigencia (RF-03): la prueba VENCE a los N días del registro
        // (ventana de calendario) — después ya no reserva aunque le quede saldo
        const vence = new Date();
        vence.setDate(vence.getDate() + dias);
        await tx.paquete.create({
          data: {
            tipo: 'PRUEBA_GRATIS',
            clasesPorSemana: 7, // sin restricción semanal durante la prueba
            saldoClases: dias,
            fechaVencimiento: vence,
            familiaId: familia.id,
          },
        });
        pruebaGratis = { dias };
      }

      return {
        asociado: false, familiaId: familia.id, codigo: familia.codigo,
        nino: ninoNuevo, pruebaGratis,
      };
    });
  }

  // T06: listado y ficha completa
  async function listarFamilias() {
    return prisma.familia.findMany({
      include: {
        tutores: { include: { persona: true } },
        ninos: true,
        paquetes: true, // Recepción asigna clases: necesita el saldo de cada paquete
      },
      orderBy: { fechaRegistro: 'desc' },
    });
  }

  async function obtenerFamilia(id) {
    return prisma.familia.findUnique({
      where: { id },
      include: {
        tutores: { include: { persona: true } },
        ninos: { include: { reservas: true, asistencias: true } },
        paquetes: true,
        pagos: true,
      },
    });
  }

  // Corrección de typos en la inscripción (extensión de CU-01).
  // RECEPCION y PROPIETARIA editan datos de contacto; cambiar la CÉDULA
  // (clave de identidad usada para deduplicar familias, T05) requiere
  // permitirCedula=true, que la ruta concede solo a PROPIETARIA.
  async function actualizarTutor(tutorId, datos, { usuarioId, permitirCedula = false } = {}) {
    const tutor = await prisma.tutor.findUnique({
      where: { id: Number(tutorId) },
      include: { persona: true },
    });
    if (!tutor) throw new ValidacionError('El tutor no existe');

    const dataPersona = {};
    if (datos.nombres !== undefined) {
      if (!datos.nombres.trim()) throw new ValidacionError('El nombre no puede quedar vacío');
      dataPersona.nombres = datos.nombres.trim();
    }
    if (datos.telefono !== undefined) dataPersona.telefono = datos.telefono;
    if (datos.correo !== undefined) {
      const motivo = motivoCorreoInvalido(datos.correo);
      if (motivo) throw new ValidacionError(motivo);
      dataPersona.correo = datos.correo;
    }
    if (datos.cedula !== undefined && datos.cedula !== tutor.persona.cedula) {
      if (!permitirCedula) {
        throw new ValidacionError('Solo la Propietaria puede corregir la cédula de un tutor');
      }
      if (!esCedulaEcuatorianaValida(datos.cedula)) {
        throw new ValidacionError('La cédula no es una cédula ecuatoriana válida (verifica los 10 dígitos)');
      }
      const ocupada = await prisma.persona.findUnique({ where: { cedula: datos.cedula } });
      if (ocupada && ocupada.id !== tutor.personaId) {
        throw new ValidacionError('Ya existe otra persona con esa cédula');
      }
      dataPersona.cedula = datos.cedula;
    }

    const dataTutor = {};
    if (datos.parentesco !== undefined) {
      if (!PARENTESCOS.includes(datos.parentesco)) {
        throw new ValidacionError(`parentesco debe ser uno de: ${PARENTESCOS.join(', ')}`);
      }
      dataTutor.parentesco = datos.parentesco;
    }

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      if (Object.keys(dataPersona).length) {
        await tx.persona.update({ where: { id: tutor.personaId }, data: dataPersona });
      }
      if (Object.keys(dataTutor).length) {
        await tx.tutor.update({ where: { id: tutor.id }, data: dataTutor });
      }
      return tx.tutor.findUnique({ where: { id: tutor.id }, include: { persona: true } });
    });
  }

  async function actualizarNino(ninoId, datos, { usuarioId } = {}) {
    const nino = await prisma.nino.findUnique({ where: { id: Number(ninoId) } });
    if (!nino) throw new ValidacionError('El niño no existe');

    const data = {};
    if (datos.nombres !== undefined) {
      if (!datos.nombres.trim()) throw new ValidacionError('El nombre no puede quedar vacío');
      // Renombrar no puede chocar con un hermano de la misma familia
      const homonimo = await buscarHermanoHomonimo(prisma, nino.familiaId, datos.nombres, nino.id);
      if (homonimo) {
        throw new ValidacionError(
          `Esta familia ya tiene registrado un niño llamado "${homonimo.nombres}".`);
      }
      data.nombres = datos.nombres.trim();
    }
    if (datos.fechaNacimiento !== undefined) {
      // Mismo rango 0–6 años que al registrar (HF-1): corregir un typo no
      // debe ser una puerta para saltarse la validación de edad.
      data.fechaNacimiento = validarFechaNacimiento(datos.fechaNacimiento);
    }
    if (datos.observacionSalud !== undefined) data.observacionSalud = datos.observacionSalud || null;
    // Baja suave: inactivo conserva historial (LOPDP) pero no puede reservar
    if (datos.activo !== undefined) {
      if (typeof datos.activo !== 'boolean') {
        throw new ValidacionError('activo debe ser true o false');
      }
      data.activo = datos.activo;
    }

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      const actualizado = await tx.nino.update({ where: { id: nino.id }, data });

      // Baja suave: cancelar SOLO las reservas ACTIVAS de clases FUTURAS,
      // devolviendo el saldo al paquete (mismo efecto que cancelarReserva).
      // Las clases pasadas/en curso se conservan como historial, y al quedar
      // canceladas las futuras dejan de contar/mostrarse en la agenda del día.
      let reservasCanceladas = 0;
      if (data.activo === false) {
        const futuras = await tx.reserva.findMany({
          where: {
            ninoId: nino.id,
            estado: 'ACTIVA',
            clase: { fechaHora: { gt: new Date() } },
          },
        });
        for (const reserva of futuras) {
          await tx.reserva.update({ where: { id: reserva.id }, data: { estado: 'CANCELADA' } });
          await tx.paquete.update({
            where: { id: reserva.paqueteId },
            data: { saldoClases: { increment: 1 } },
          });
        }
        reservasCanceladas = futuras.length;
      }
      return { ...actualizado, reservasCanceladas };
    });
  }

  // Extensión RF-03: contratar un paquete del CATÁLOGO para una familia.
  // RECEPCION y PROPIETARIA. Los valores (tipo, clasesPorSemana, saldo) se
  // COPIAN de la plantilla — Recepción no los inventa. El pago es OPCIONAL
  // (puede cobrarse por fuera); si conPago=true se registra un Pago con el
  // precio del catálogo y comprobante Dátil en la MISMA transacción.
  async function contratarPaquete(familiaId, { paqueteCatalogoId, conPago = false }, { usuarioId } = {}) {
    if (!paqueteCatalogoId) throw new ValidacionError('paqueteCatalogoId es obligatorio');

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      const familia = await tx.familia.findUnique({ where: { id: Number(familiaId) } });
      if (!familia) throw new ValidacionError('La familia no existe');

      const plantilla = await tx.paqueteCatalogo.findUnique({
        where: { id: Number(paqueteCatalogoId) },
      });
      if (!plantilla) throw new ValidacionError('El paquete no existe en el catálogo');
      if (!plantilla.activo) {
        throw new ValidacionError('Ese paquete del catálogo está inactivo y ya no se ofrece');
      }
      if (conPago && (plantilla.precio === null || plantilla.precio === undefined)) {
        throw new ValidacionError(
          'El paquete no tiene precio en el catálogo; registra el pago por separado o pide a la Propietaria fijar el precio');
      }

      // Vigencia (RF-03): si la plantilla define duración, el paquete vence
      // hoy + duracionDias; sin duración, no vence (fechaVencimiento null)
      let fechaVencimiento = null;
      if (plantilla.duracionDias) {
        fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + plantilla.duracionDias);
      }

      const paquete = await tx.paquete.create({
        data: {
          tipo: plantilla.tipo,
          clasesPorSemana: plantilla.clasesPorSemana,
          saldoClases: plantilla.saldoClases,
          fechaVencimiento,
          familiaId: familia.id,
        },
      });

      let pago = null;
      if (conPago) {
        const comprobante = emitirComprobanteDatil({ familiaId: familia.id, monto: plantilla.precio });
        pago = await tx.pago.create({
          data: {
            familiaId: familia.id,
            monto: plantilla.precio,
            numeroComprobante: comprobante.numeroComprobante,
          },
        });
      }
      return { paquete, pago, plantilla: { nombre: plantilla.nombre } };
    });
  }

  // Extensión RF-03: ajuste manual de un paquete contratado — SOLO PROPIETARIA
  // (la ruta restringe el rol). El saldo es dinero en especie: el sistema ya
  // lo mueve solo (reservar descuenta, cancelar/baja devuelve); todo ajuste
  // manual queda auditado con el usuario_id de la Propietaria.
  async function ajustarPaquete(paqueteId, datos, { usuarioId } = {}) {
    const paquete = await prisma.paquete.findUnique({ where: { id: Number(paqueteId) } });
    if (!paquete) throw new ValidacionError('El paquete no existe');

    const data = {};
    if (datos.saldoClases !== undefined) {
      const saldo = Number(datos.saldoClases);
      if (!Number.isInteger(saldo) || saldo < 0) {
        throw new ValidacionError('saldoClases debe ser un entero mayor o igual a 0');
      }
      data.saldoClases = saldo;
    }
    if (datos.clasesPorSemana !== undefined) {
      const cps = Number(datos.clasesPorSemana);
      if (!Number.isInteger(cps) || cps < 1 || cps > 7) {
        throw new ValidacionError('clasesPorSemana debe estar entre 1 y 7');
      }
      data.clasesPorSemana = cps;
    }
    if (!Object.keys(data).length) throw new ValidacionError('Nada que ajustar');

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.paquete.update({ where: { id: paquete.id }, data });
    });
  }

  return {
    registrarFamilia, listarFamilias, obtenerFamilia,
    actualizarTutor, actualizarNino, contratarPaquete, ajustarPaquete,
  };
}

module.exports = {
  crearFamiliaService, ValidacionError, CANALES,
  // expuestos para las pruebas y para reusar el mismo rango en otras capas
  edadEnAnios, EDAD_MAXIMA_ANIOS,
};