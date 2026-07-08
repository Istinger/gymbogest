// ============================================================
// services/indicadorService.js
// RF-07 / CU-03 — Indicadores reales para la propietaria (Fase 4: T15)
// Responde directamente a la frase de la entrevista:
//   «el sistema de la franquicia no arroja datos reales»
// Mide la estrategia MAX-MAX (F2→O3,O4): inscripciones por canal.
// SOLID-D: recibe prisma inyectado.
// ============================================================
function rangoDefault({ desde, hasta }) {
  const fin = hasta ? new Date(hasta) : new Date();
  const inicio = desde ? new Date(desde) : new Date(fin.getFullYear(), fin.getMonth() - 1, fin.getDate());
  return { inicio, fin };
}

function crearIndicadorService(prisma) {
  // Niños activos = con al menos una reserva ACTIVA vigente
  async function ninosActivos() {
    const distintos = await prisma.reserva.findMany({
      where: { estado: 'ACTIVA' },
      distinct: ['ninoId'],
      select: { ninoId: true },
    });
    return distintos.length;
  }

  // Inscritos por semana/mes en el rango (usa Familia.fechaRegistro)
  async function inscritosPorPeriodo({ desde, hasta }) {
    const { inicio, fin } = rangoDefault({ desde, hasta });
    const familias = await prisma.familia.findMany({
      where: { fechaRegistro: { gte: inicio, lte: fin } },
      select: { fechaRegistro: true },
    });
    return { total: familias.length, desde: inicio, hasta: fin };
  }

  // RF-07 clave: inscripciones por canal de origen — mide la estrategia MAX-MAX
  async function inscripcionesPorCanal({ desde, hasta } = {}) {
    const { inicio, fin } = rangoDefault({ desde, hasta });
    const grupos = await prisma.familia.groupBy({
      by: ['canalOrigen'],
      where: { fechaRegistro: { gte: inicio, lte: fin } },
      _count: { _all: true },
    });
    return grupos.map((g) => ({ canal: g.canalOrigen, total: g._count._all }));
  }

  // Conversión: niños con CLASE_PRUEBA que NUNCA llegaron a tener una reserva normal
  async function conversionClasePrueba() {
    const probaron = await prisma.asistencia.findMany({
      where: { estado: 'CLASE_PRUEBA' },
      distinct: ['ninoId'],
      select: { ninoId: true },
    });
    if (probaron.length === 0) return { probaron: 0, convertidos: 0, tasaConversion: 0 };

    const idsProbaron = probaron.map((p) => p.ninoId);
    const conReservaActiva = await prisma.reserva.findMany({
      where: { ninoId: { in: idsProbaron }, estado: 'ACTIVA' },
      distinct: ['ninoId'],
      select: { ninoId: true },
    });
    const convertidos = conReservaActiva.length;
    return {
      probaron: probaron.length,
      convertidos,
      tasaConversion: Number((convertidos / probaron.length).toFixed(2)),
    };
  }

  // Asistencia por clase (para detectar clases con mucha inasistencia)
  async function asistenciaPorClase({ desde, hasta } = {}) {
    const { inicio, fin } = rangoDefault({ desde, hasta });
    const registros = await prisma.asistencia.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { clase: { select: { id: true, programa: true } } },
    });
    const porClase = {};
    for (const r of registros) {
      const key = r.claseId;
      porClase[key] ??= { claseId: key, programa: r.clase.programa, asistio: 0, falto: 0, prueba: 0 };
      if (r.estado === 'ASISTIO') porClase[key].asistio++;
      else if (r.estado === 'FALTO') porClase[key].falto++;
      else porClase[key].prueba++;
    }
    return Object.values(porClase);
  }

  // Tablero consolidado — lo que consume el wireframe del panel de Propietaria
  async function tablero({ desde, hasta } = {}) {
    const [activos, inscritos, porCanal, conversion, asistencia] = await Promise.all([
      ninosActivos(),
      inscritosPorPeriodo({ desde, hasta }),
      inscripcionesPorCanal({ desde, hasta }),
      conversionClasePrueba(),
      asistenciaPorClase({ desde, hasta }),
    ]);
    return { ninosActivos: activos, inscritos, inscripcionesPorCanal: porCanal, conversion, asistenciaPorClase: asistencia };
  }

  return { ninosActivos, inscritosPorPeriodo, inscripcionesPorCanal, conversionClasePrueba, asistenciaPorClase, tablero };
}

module.exports = { crearIndicadorService };
