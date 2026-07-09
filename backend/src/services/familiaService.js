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
  if (!/^\d{10}$/.test(tutor.cedula)) {
    throw new ValidacionError('La cédula debe tener 10 dígitos');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutor.correo)) {
    throw new ValidacionError('El correo no tiene un formato válido');
  }
  if (!CANALES.includes(canalOrigen)) {
    throw new ValidacionError(`canalOrigen debe ser uno de: ${CANALES.join(', ')}`);
  }
  if (isNaN(Date.parse(nino.fechaNacimiento))) {
    throw new ValidacionError('fechaNacimiento no es una fecha válida');
  }
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

      return { asociado: false, familiaId: familia.id, codigo: familia.codigo, nino: ninoNuevo };
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

  return { registrarFamilia, listarFamilias, obtenerFamilia };
}

module.exports = { crearFamiliaService, ValidacionError, CANALES };