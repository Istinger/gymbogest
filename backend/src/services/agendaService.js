// ============================================================
// services/agendaService.js
// Fase 2: T10 — Agenda del día (panel de Recepción, wireframe 3
// del Avance 7: tabla Hora/Programa/Educadora/Cupo(máx.9)/Acciones)
// SOLID-D: recibe prisma inyectado.
// ============================================================
function crearAgendaService(prisma) {
  // GET /api/agenda?fecha=YYYY-MM-DD
  async function agendaDelDia(fecha) {
    const inicio = new Date(fecha); inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha); fin.setHours(23, 59, 59, 999);

    const clases = await prisma.clase.findMany({
      where: { fechaHora: { gte: inicio, lte: fin } },
      include: {
        empleado: { include: { persona: true } },
        _count: { select: { reservas: { where: { estado: 'ACTIVA' } } } },
      },
      orderBy: { fechaHora: 'asc' },
    });

    // Formato directamente consumible por el wireframe: "5 / 9"
    return clases.map((c) => ({
      id: c.id,
      hora: c.fechaHora,
      programa: c.programa,
      educadora: c.empleado.persona.nombres,
      ocupacion: `${c._count.reservas} / ${c.cupoMaximo}`,
      cupoLleno: c._count.reservas >= c.cupoMaximo,
    }));
  }

  return { agendaDelDia };
}

module.exports = { crearAgendaService };
