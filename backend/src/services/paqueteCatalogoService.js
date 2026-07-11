// ============================================================
// services/paqueteCatalogoService.js
// Extensión RF-01/RF-03 — Catálogo de paquetes del centro y
// configuración de la prueba gratis por registro.
// La PROPIETARIA crea/edita/desactiva/elimina paquetes del catálogo
// y define cuántos días de prueba gratis recibe una familia nueva.
// SOLID-D: recibe prisma inyectado.
// ============================================================

class CatalogoInvalidoError extends Error {}

function validarPaquete({ nombre, tipo, clasesPorSemana, saldoClases, precio }, parcial = false) {
  const errores = [];
  if (!parcial || nombre !== undefined) {
    if (!nombre?.trim()) errores.push('nombre es obligatorio');
  }
  if (!parcial || tipo !== undefined) {
    if (!tipo?.trim()) errores.push('tipo es obligatorio (mensual, trimestral, …)');
  }
  if (!parcial || clasesPorSemana !== undefined) {
    if (!Number.isInteger(clasesPorSemana) || clasesPorSemana < 1 || clasesPorSemana > 7) {
      errores.push('clasesPorSemana debe ser un entero entre 1 y 7 (entrevista)');
    }
  }
  if (!parcial || saldoClases !== undefined) {
    if (!Number.isInteger(saldoClases) || saldoClases < 1) {
      errores.push('saldoClases debe ser un entero mayor a 0');
    }
  }
  if (precio !== undefined && precio !== null && (typeof precio !== 'number' || precio < 0)) {
    errores.push('precio debe ser un número mayor o igual a 0');
  }
  if (errores.length) throw new CatalogoInvalidoError(errores.join('; '));
}

// Vigencia (RF-03): duración en días al contratar; null = no vence
function validarDuracion(duracionDias) {
  if (duracionDias !== undefined && duracionDias !== null
      && (!Number.isInteger(duracionDias) || duracionDias < 1 || duracionDias > 365)) {
    throw new CatalogoInvalidoError('duracionDias debe ser un entero entre 1 y 365 (o vacío si no vence)');
  }
}

function crearPaqueteCatalogoService(prisma) {
  // Recepción ve solo los activos (para ofrecer); Propietaria ve todos
  async function listarCatalogo({ soloActivos = false } = {}) {
    return prisma.paqueteCatalogo.findMany({
      where: soloActivos ? { activo: true } : {},
      orderBy: { nombre: 'asc' },
    });
  }

  async function crearPaquete(datos, usuarioId) {
    validarPaquete(datos);
    validarDuracion(datos.duracionDias);
    const existente = await prisma.paqueteCatalogo.findUnique({
      where: { nombre: datos.nombre.trim() },
    });
    if (existente) throw new CatalogoInvalidoError('Ya existe un paquete con ese nombre');

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.paqueteCatalogo.create({
        data: {
          nombre: datos.nombre.trim(),
          tipo: datos.tipo.trim(),
          clasesPorSemana: datos.clasesPorSemana,
          saldoClases: datos.saldoClases,
          precio: datos.precio ?? null,
          duracionDias: datos.duracionDias ?? null,
        },
      });
    });
  }

  async function actualizarPaquete(id, datos, usuarioId) {
    const paquete = await prisma.paqueteCatalogo.findUnique({ where: { id: Number(id) } });
    if (!paquete) throw new CatalogoInvalidoError('El paquete no existe en el catálogo');
    validarPaquete(datos, true);
    validarDuracion(datos.duracionDias);
    if (datos.activo !== undefined && typeof datos.activo !== 'boolean') {
      throw new CatalogoInvalidoError('activo debe ser true o false');
    }
    if (datos.nombre !== undefined && datos.nombre.trim() !== paquete.nombre) {
      const otro = await prisma.paqueteCatalogo.findUnique({ where: { nombre: datos.nombre.trim() } });
      if (otro) throw new CatalogoInvalidoError('Ya existe un paquete con ese nombre');
    }

    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.paqueteCatalogo.update({
        where: { id: paquete.id },
        data: {
          ...(datos.nombre !== undefined && { nombre: datos.nombre.trim() }),
          ...(datos.tipo !== undefined && { tipo: datos.tipo.trim() }),
          ...(datos.clasesPorSemana !== undefined && { clasesPorSemana: datos.clasesPorSemana }),
          ...(datos.saldoClases !== undefined && { saldoClases: datos.saldoClases }),
          ...(datos.precio !== undefined && { precio: datos.precio }),
          ...(datos.duracionDias !== undefined && { duracionDias: datos.duracionDias }),
          ...(datos.activo !== undefined && { activo: datos.activo }),
        },
      });
    });
  }

  // Eliminación real: el catálogo es una plantilla sin FKs (los Paquete
  // contratados por familias NO lo referencian, no se pierde historial).
  // Para retirar una oferta sin borrarla, usar activo=false.
  async function eliminarPaquete(id, usuarioId) {
    const paquete = await prisma.paqueteCatalogo.findUnique({ where: { id: Number(id) } });
    if (!paquete) throw new CatalogoInvalidoError('El paquete no existe en el catálogo');
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.paqueteCatalogo.delete({ where: { id: paquete.id } });
    });
  }

  // Configuración de la prueba gratis (fila única id=1)
  async function obtenerConfigPrueba() {
    const config = await prisma.configuracionPrueba.findUnique({ where: { id: 1 } });
    return config || { id: 1, habilitado: true, diasPrueba: 3 }; // default del negocio
  }

  async function actualizarConfigPrueba({ habilitado, diasPrueba }, usuarioId) {
    if (habilitado !== undefined && typeof habilitado !== 'boolean') {
      throw new CatalogoInvalidoError('habilitado debe ser true o false');
    }
    if (diasPrueba !== undefined
        && (!Number.isInteger(diasPrueba) || diasPrueba < 1 || diasPrueba > 30)) {
      throw new CatalogoInvalidoError('diasPrueba debe ser un entero entre 1 y 30');
    }
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      return tx.configuracionPrueba.upsert({
        where: { id: 1 },
        create: { id: 1, habilitado: habilitado ?? true, diasPrueba: diasPrueba ?? 3 },
        update: {
          ...(habilitado !== undefined && { habilitado }),
          ...(diasPrueba !== undefined && { diasPrueba }),
        },
      });
    });
  }

  return {
    listarCatalogo, crearPaquete, actualizarPaquete, eliminarPaquete,
    obtenerConfigPrueba, actualizarConfigPrueba,
  };
}

module.exports = { crearPaqueteCatalogoService, CatalogoInvalidoError };
