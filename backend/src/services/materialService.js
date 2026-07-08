// ============================================================
// services/materialService.js
// RF-06 — Gestión de inventario (Fase 3: T14)
// Criterio de aceptación (HF-6): si stock < stockMinimo → alerta.
// Reemplaza el "Excel desactualizado" declarado en la entrevista.
// SOLID-D: recibe prisma inyectado.
// ============================================================
class MaterialInvalidoError extends Error {}

function crearMaterialService(prisma) {
  async function crearMaterial({ nombre, stock = 0, stockMinimo = 0 }) {
    if (!nombre?.trim()) throw new MaterialInvalidoError('nombre es obligatorio');
    if (stock < 0 || stockMinimo < 0) {
      throw new MaterialInvalidoError('stock y stockMinimo no pueden ser negativos');
    }
    return prisma.materialDidactico.create({ data: { nombre, stock, stockMinimo } });
  }

  // Entradas (delta > 0) y salidas (delta < 0). El trigger de auditoría
  // registra automáticamente cada UPDATE con el usuario responsable.
  async function registrarMovimiento({ materialId, delta, usuarioId }) {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new MaterialInvalidoError('delta debe ser un entero distinto de 0');
    }
    return prisma.$transaction(async (tx) => {
      if (usuarioId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${Number(usuarioId)}'`);
      }
      const material = await tx.materialDidactico.findUnique({ where: { id: materialId } });
      if (!material) throw new MaterialInvalidoError('El material no existe');
      const nuevoStock = material.stock + delta;
      if (nuevoStock < 0) {
        throw new MaterialInvalidoError(
          `Stock insuficiente: hay ${material.stock} y se intenta retirar ${-delta}`);
      }
      const actualizado = await tx.materialDidactico.update({
        where: { id: materialId },
        data: { stock: nuevoStock },
      });
      return { ...actualizado, enAlerta: actualizado.stock < actualizado.stockMinimo };
    });
  }

  async function listarMateriales() {
    const materiales = await prisma.materialDidactico.findMany({ orderBy: { nombre: 'asc' } });
    return materiales.map((m) => ({ ...m, enAlerta: m.stock < m.stockMinimo }));
  }

  // HF-6: alertas de reposición (para el panel de Recepción)
  async function alertas() {
    const materiales = await prisma.materialDidactico.findMany();
    return materiales.filter((m) => m.stock < m.stockMinimo);
  }

  return { crearMaterial, registrarMovimiento, listarMateriales, alertas };
}

module.exports = { crearMaterialService, MaterialInvalidoError };
