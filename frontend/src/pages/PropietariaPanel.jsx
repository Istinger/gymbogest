// T22 — Panel Propietaria (RF-07 indicadores / RF-08 corporativos)
// Wireframe 5 del Avance 7: tablero de indicadores destacando inscripciones
// por canal (métrica de la estrategia MAX-MAX) y gestión de corporativos
// "On The Go". La administración de cuentas vive en el panel ADMIN aparte.
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useData } from '../contexts/DataContext';

const PROGRAMAS = {
  PLAY_LEARN: '🎨 Play & Learn',
  MUSIC: '🎵 Music',
  ART: '🖼️ Art',
  SCHOOL_SKILLS: '📚 School Skills',
  PLAYLAB: '🧪 PlayLab',
};

const CANAL_LABELS = {
  REDES: '📱 Redes sociales',
  PEDIATRA_ALIADO: '🩺 Pediatra aliado',
  EMPRESA: '🏢 Empresas',
  REFERIDO: '🤝 Referidos',
};

const ESTADOS_EVENTO = {
  SOLICITADO: '#f39c12',
  CONFIRMADO: '#27ae60',
  EJECUTADO: '#3498db',
  CANCELADO: '#e74c3c',
};

export function PropietariaPanel() {
  const [seccion, setSeccion] = useState('indicadores');

  const tabs = [
    { id: 'indicadores', label: '📊 Indicadores' },
    { id: 'clases', label: '📅 Clases' },
    { id: 'paquetes', label: '📦 Paquetes' },
    { id: 'corporativos', label: '🏢 Corporativos' },
  ];

  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            👑 Panel de Propietaria
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Indicadores del negocio y servicios corporativos
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id)}
              style={{
                padding: '0.7rem 1.4rem',
                backgroundColor: seccion === tab.id ? '#667eea' : 'white',
                color: seccion === tab.id ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem' }}>
          {seccion === 'indicadores' && <TableroIndicadores />}
          {seccion === 'clases' && <ProgramarClases />}
          {seccion === 'paquetes' && <GestionPaquetes />}
          {seccion === 'corporativos' && <Corporativos />}
        </div>
      </div>
    </Layout>
  );
}

// ---------- RF-07: tablero de indicadores (GET /api/indicadores) ----------
function TableroIndicadores() {
  const { getIndicadores } = useData();
  const [tablero, setTablero] = useState(null);

  useEffect(() => {
    getIndicadores().then((data) => data && setTablero(data));
  }, [getIndicadores]);

  if (!tablero) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando indicadores...</p>
      </div>
    );
  }

  const canales = tablero.inscripcionesPorCanal || [];
  const maxCanal = Math.max(1, ...canales.map((c) => c.total));
  const conversion = tablero.conversion || {};

  const cardStyle = {
    padding: '1.2rem',
    borderRadius: '8px',
    backgroundColor: '#f5f6ff',
    border: '1px solid #e0e3ff',
    textAlign: 'center',
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{tablero.ninosActivos}</div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>Niños activos</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{tablero.inscritos?.total ?? 0}</div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>Familias inscritas (último mes)</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
            {Math.round((conversion.tasaConversion || 0) * 100)}%
          </div>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            Conversión clase de prueba ({conversion.convertidos ?? 0}/{conversion.probaron ?? 0})
          </div>
        </div>
      </div>

      {/* Métrica clave de la estrategia MAX-MAX: inscripciones por canal */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '8px', border: '2px solid #667eea', backgroundColor: '#fbfbff' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>⭐ Inscripciones por canal de origen</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Métrica de la estrategia MAX-MAX: mide qué canal (redes, pediatras aliados, empresas, referidos) trae más familias.
        </p>
        {canales.length === 0 ? (
          <p style={{ color: '#999' }}>Sin inscripciones en el último mes</p>
        ) : (
          canales
            .slice()
            .sort((a, b) => b.total - a.total)
            .map((c) => (
              <div key={c.canal} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.6rem' }}>
                <span style={{ width: '180px', fontSize: '0.9rem', fontWeight: 600 }}>
                  {CANAL_LABELS[c.canal] || c.canal}
                </span>
                <div style={{ flex: 1, backgroundColor: '#eee', borderRadius: '6px', overflow: 'hidden', height: '26px' }}>
                  <div
                    style={{
                      width: `${(c.total / maxCanal) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '0.5rem',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      minWidth: '2rem',
                    }}
                  >
                    {c.total}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      <SeguimientoFaltas />

      <h3 style={{ marginBottom: '1rem' }}>Asistencia por clase</h3>
      {(tablero.asistenciaPorClase || []).length === 0 ? (
        <p style={{ color: '#999' }}>Sin registros de asistencia en el último mes</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Clase</th>
              <th style={{ padding: '0.6rem' }}>✅ Asistió</th>
              <th style={{ padding: '0.6rem' }}>❌ Faltó</th>
              <th style={{ padding: '0.6rem' }}>🎈 Prueba</th>
            </tr>
          </thead>
          <tbody>
            {tablero.asistenciaPorClase.map((a) => (
              <tr key={a.claseId} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '0.6rem' }}>{PROGRAMAS[a.programa] || a.programa} (clase {a.claseId})</td>
                <td style={{ padding: '0.6rem', color: '#27ae60', fontWeight: 600 }}>{a.asistio}</td>
                <td style={{ padding: '0.6rem', color: '#e74c3c', fontWeight: 600 }}>{a.falto}</td>
                <td style={{ padding: '0.6rem', color: '#f39c12', fontWeight: 600 }}>{a.prueba}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Calendario mensual: qué educadora imparte qué clase y a qué hora ----------
const COLORES_EDUCADORA = ['#667eea', '#27ae60', '#e67e22', '#e74c3c', '#16a085', '#8e44ad'];

function CalendarioMensual({ clases }) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  const cambiarMes = (delta) => {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  // Color estable por educadora (según orden de aparición)
  const nombresEducadoras = [...new Set(clases.map((c) => c.empleado?.persona?.nombres || 'Sin asignar'))];
  const colorDe = (nombre) => COLORES_EDUCADORA[nombresEducadoras.indexOf(nombre) % COLORES_EDUCADORA.length];

  // Clases del mes visible, agrupadas por día (fecha local)
  const clasesDelMes = clases.filter((c) => {
    const d = new Date(c.fechaHora);
    return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
  });
  const porDia = {};
  for (const c of clasesDelMes) {
    const dia = new Date(c.fechaHora).getDate();
    (porDia[dia] ??= []).push(c);
  }
  Object.values(porDia).forEach((lista) => lista.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora)));

  // Celdas del calendario: la semana empieza en lunes
  const primerDiaSemana = (mes.getDay() + 6) % 7; // 0 = lunes
  const diasDelMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: diasDelMes }, (_, i) => i + 1)];

  const hoy = new Date();
  const esHoy = (dia) => dia === hoy.getDate() && mes.getMonth() === hoy.getMonth() && mes.getFullYear() === hoy.getFullYear();

  const formatHora = (fechaHora) =>
    new Date(fechaHora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e3ff', backgroundColor: '#fbfbff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>🗓️ Calendario de educadoras</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button onClick={() => cambiarMes(-1)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>◀</button>
          <strong style={{ minWidth: '160px', textAlign: 'center', textTransform: 'capitalize' }}>
            {mes.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}
          </strong>
          <button onClick={() => cambiarMes(1)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 600 }}>▶</button>
        </div>
      </div>

      {/* Leyenda: color por educadora */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {nombresEducadoras.map((nombre) => (
          <span key={nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: colorDe(nombre) }} />
            {nombre}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#888', padding: '0.4rem 0' }}>
            {d}
          </div>
        ))}
        {celdas.map((dia, i) => (
          <div
            key={i}
            style={{
              minHeight: '84px',
              borderRadius: '6px',
              border: dia ? (esHoy(dia) ? '2px solid #667eea' : '1px solid #eee') : 'none',
              backgroundColor: dia ? 'white' : 'transparent',
              padding: '0.3rem',
            }}
          >
            {dia && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: esHoy(dia) ? '#667eea' : '#aaa', marginBottom: '0.2rem' }}>
                  {dia}
                </div>
                {(porDia[dia] || []).map((c) => {
                  const nombre = c.empleado?.persona?.nombres || 'Sin asignar';
                  return (
                    <div
                      key={c.id}
                      title={`${PROGRAMAS[c.programa] || c.programa} — ${formatHora(c.fechaHora)} — ${nombre}`}
                      style={{
                        backgroundColor: colorDe(nombre),
                        color: 'white',
                        borderRadius: '4px',
                        padding: '0.15rem 0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {formatHora(c.fechaHora)} {(PROGRAMAS[c.programa] || c.programa).split(' ')[0]} · {nombre.split(' ')[0]}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Seguimiento de faltas: exportar Excel para contacto externo ----------
// La propietaria descarga la lista de niños que FALTARON (día/semana/mes) con el
// contacto del tutor a cargo, para dar seguimiento por llamada/WhatsApp fuera del sistema.
function SeguimientoFaltas() {
  const { getFaltas } = useData();
  const [periodo, setPeriodo] = useState('semana');
  const [faltas, setFaltas] = useState([]);

  // Rango de fechas según el periodo elegido
  const rangoDelPeriodo = useCallback((p) => {
    const hasta = new Date();
    const desde = new Date();
    if (p === 'dia') desde.setHours(0, 0, 0, 0);
    if (p === 'semana') desde.setDate(desde.getDate() - 7);
    if (p === 'mes') desde.setMonth(desde.getMonth() - 1);
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }, []);

  useEffect(() => {
    getFaltas(rangoDelPeriodo(periodo)).then((data) => data && setFaltas(data));
  }, [periodo, getFaltas, rangoDelPeriodo]);

  const descargarExcel = () => {
    // CSV con BOM UTF-8 y separador ";" — Excel lo abre directo con doble clic
    const encabezado = ['Fecha falta', 'Niño', 'Clase', 'Horario de la clase', 'Educadora', 'Tutor a cargo', 'Parentesco', 'Teléfono', 'Correo'];
    const filas = faltas.map((f) => [
      new Date(f.fecha).toLocaleDateString('es-EC'),
      f.nino,
      PROGRAMAS[f.programa]?.replace(/^\S+\s/, '') || f.programa, // sin emoji
      new Date(f.claseFechaHora).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
      f.educadora,
      f.tutor,
      f.parentesco,
      f.telefono,
      f.correo,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `seguimiento_faltas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const ETIQUETAS = { dia: 'Hoy', semana: 'Última semana', mes: 'Último mes' };

  return (
    <div style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e0e3ff', backgroundColor: '#f5f6ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>📥 Seguimiento de faltas (Excel)</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
            Niños que faltaron a clases con el contacto de su tutor, para dar seguimiento por llamada o WhatsApp.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem' }}
          >
            {Object.entries(ETIQUETAS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
          <button
            onClick={descargarExcel}
            disabled={faltas.length === 0}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: faltas.length ? '#27ae60' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: faltas.length ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            📊 Descargar Excel ({faltas.length})
          </button>
        </div>
      </div>

      {faltas.length === 0 ? (
        <p style={{ color: '#999', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
          Sin faltas registradas en el periodo "{ETIQUETAS[periodo]}" 🎉
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dde', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Fecha</th>
              <th style={{ padding: '0.5rem' }}>Niño</th>
              <th style={{ padding: '0.5rem' }}>Clase</th>
              <th style={{ padding: '0.5rem' }}>Tutor a cargo</th>
              <th style={{ padding: '0.5rem' }}>Teléfono</th>
              <th style={{ padding: '0.5rem' }}>Correo</th>
            </tr>
          </thead>
          <tbody>
            {faltas.map((f, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e8e8f5' }}>
                <td style={{ padding: '0.5rem' }}>{new Date(f.fecha).toLocaleDateString('es-EC')}</td>
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>{f.nino}</td>
                <td style={{ padding: '0.5rem' }}>{PROGRAMAS[f.programa] || f.programa}</td>
                <td style={{ padding: '0.5rem' }}>{f.tutor} <span style={{ color: '#999' }}>({f.parentesco})</span></td>
                <td style={{ padding: '0.5rem' }}>{f.telefono || '—'}</td>
                <td style={{ padding: '0.5rem' }}>{f.correo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- RF-02 / T07: programar clases y asignarlas a educadoras ----------
function ProgramarClases() {
  const { clases, getClases, createClase, updateClase, getEmpleados, loading } = useData();
  const [educadoras, setEducadoras] = useState([]);
  const [editando, setEditando] = useState(null); // clase en edición
  const [formData, setFormData] = useState({ programa: '', fecha: '', hora: '', empleadoId: '' });
  const [filtros, setFiltros] = useState({ programa: '', fecha: '', empleadoId: '', cupo: '' });

  useEffect(() => {
    getClases();
    getEmpleados('educadora').then((data) => data && setEducadoras(data));
  }, [getClases, getEmpleados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClase({
        programa: formData.programa,
        // ISO con zona horaria del navegador: la hora escrita = la hora mostrada
        fechaHora: new Date(`${formData.fecha}T${formData.hora}:00`).toISOString(),
        empleadoId: Number(formData.empleadoId),
      });
      setFormData({ programa: '', fecha: '', hora: '', empleadoId: '' });
      await getClases();
    } catch (error) { /* toast en DataContext */ }
  };

  const inputStyle = { width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' };

  const handleFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((p) => ({ ...p, [name]: value }));
  };

  // Fecha local YYYY-MM-DD de una clase (para comparar con el filtro de fecha)
  const fechaLocal = (fechaHora) => {
    const d = new Date(fechaHora);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const clasesOrdenadas = clases
    .filter((c) => {
      const ocupado = c._count?.reservas ?? 0;
      if (filtros.programa && c.programa !== filtros.programa) return false;
      if (filtros.fecha && fechaLocal(c.fechaHora) !== filtros.fecha) return false;
      if (filtros.empleadoId && c.empleadoId !== Number(filtros.empleadoId)) return false;
      if (filtros.cupo === 'disponible' && ocupado >= c.cupoMaximo) return false;
      if (filtros.cupo === 'llena' && ocupado < c.cupoMaximo) return false;
      return true;
    })
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  const hayFiltros = filtros.programa || filtros.fecha || filtros.empleadoId || filtros.cupo;

  // Exporta a Excel (CSV con BOM UTF-8) lo que muestra la tabla, filtros incluidos
  const descargarExcel = () => {
    const encabezado = ['Fecha', 'Día', 'Hora', 'Programa', 'Educadora', 'Cupo ocupado', 'Cupo máximo', 'Estado'];
    const filas = clasesOrdenadas.map((c) => {
      const d = new Date(c.fechaHora);
      const ocupado = c._count?.reservas ?? 0;
      return [
        d.toLocaleDateString('es-EC'),
        d.toLocaleDateString('es-EC', { weekday: 'long' }),
        d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        (PROGRAMAS[c.programa] || c.programa).replace(/^\S+\s/, ''),
        c.empleado?.persona?.nombres || 'Sin asignar',
        ocupado,
        c.cupoMaximo,
        ocupado >= c.cupoMaximo ? 'LLENA' : 'CON CUPO',
      ];
    });
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `clases_programadas_${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Programar nueva clase</h3>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Define el programa, el día, la hora y la educadora que la imparte (cupo máximo: 9).
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}
      >
        <div className="form-group">
          <label>Programa *</label>
          <select value={formData.programa} onChange={(e) => setFormData((p) => ({ ...p, programa: e.target.value }))} style={inputStyle} required disabled={loading}>
            <option value="">-- Selecciona --</option>
            {Object.entries(PROGRAMAS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Día *</label>
          <input type="date" value={formData.fecha} onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))} style={inputStyle} required disabled={loading} />
        </div>
        <div className="form-group">
          <label>Hora *</label>
          <input type="time" value={formData.hora} onChange={(e) => setFormData((p) => ({ ...p, hora: e.target.value }))} style={inputStyle} required disabled={loading} />
        </div>
        <div className="form-group">
          <label>Educadora *</label>
          <select value={formData.empleadoId} onChange={(e) => setFormData((p) => ({ ...p, empleadoId: e.target.value }))} style={inputStyle} required disabled={loading}>
            <option value="">-- Selecciona --</option>
            {educadoras.map((edu) => (
              <option key={edu.id} value={edu.id}>{edu.persona?.nombres || `Empleado ${edu.id}`}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn" style={{ padding: '0.7rem 1rem', margin: 0 }} disabled={loading}>
          ➕ Programar
        </button>
      </form>

      <CalendarioMensual clases={clases} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Clases programadas</h3>
        <button
          onClick={descargarExcel}
          disabled={clasesOrdenadas.length === 0}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: clasesOrdenadas.length ? '#27ae60' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: clasesOrdenadas.length ? 'pointer' : 'default',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          📊 Descargar Excel ({clasesOrdenadas.length})
        </button>
      </div>

      {/* Filtros: programa, fecha, educadora y cupo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f6ff', borderRadius: '8px' }}>
        <div className="form-group">
          <label style={{ fontSize: '0.85rem' }}>Programa</label>
          <select name="programa" value={filtros.programa} onChange={handleFiltro} style={inputStyle}>
            <option value="">Todos</option>
            {Object.entries(PROGRAMAS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.85rem' }}>Fecha</label>
          <input type="date" name="fecha" value={filtros.fecha} onChange={handleFiltro} style={inputStyle} />
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.85rem' }}>Educadora</label>
          <select name="empleadoId" value={filtros.empleadoId} onChange={handleFiltro} style={inputStyle}>
            <option value="">Todas</option>
            {educadoras.map((edu) => (
              <option key={edu.id} value={edu.id}>{edu.persona?.nombres || `Empleado ${edu.id}`}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.85rem' }}>Cupo</label>
          <select name="cupo" value={filtros.cupo} onChange={handleFiltro} style={inputStyle}>
            <option value="">Todos</option>
            <option value="disponible">✅ Con cupo</option>
            <option value="llena">❌ Llenas</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setFiltros({ programa: '', fecha: '', empleadoId: '', cupo: '' })}
          disabled={!hayFiltros}
          style={{
            padding: '0.7rem 1rem',
            backgroundColor: hayFiltros ? '#667eea' : '#ddd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: hayFiltros ? 'pointer' : 'default',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          ✕ Limpiar
        </button>
      </div>

      {clasesOrdenadas.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
          {hayFiltros ? 'Ninguna clase coincide con los filtros' : 'No hay clases programadas'}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Programa</th>
              <th style={{ padding: '0.6rem' }}>Día</th>
              <th style={{ padding: '0.6rem' }}>Hora</th>
              <th style={{ padding: '0.6rem' }}>Educadora</th>
              <th style={{ padding: '0.6rem' }}>Cupo</th>
              <th style={{ padding: '0.6rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {clasesOrdenadas.map((c) => {
              const ocupado = c._count?.reservas ?? 0;
              const d = new Date(c.fechaHora);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>{PROGRAMAS[c.programa] || c.programa}</td>
                  <td style={{ padding: '0.6rem' }}>
                    {d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    {d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.6rem' }}>{c.empleado?.persona?.nombres || 'Sin asignar'}</td>
                  <td style={{ padding: '0.6rem', fontWeight: 600, color: ocupado >= c.cupoMaximo ? '#e74c3c' : '#27ae60' }}>
                    {ocupado} / {c.cupoMaximo}
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <button
                      onClick={() => setEditando(c)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editando && (
        <EditarClaseModal
          clase={editando}
          educadoras={educadoras}
          onClose={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await getClases(); }}
        />
      )}
    </div>
  );
}

// Ventana emergente: reprogramar día/hora o reasignar la educadora de una clase
function EditarClaseModal({ clase, educadoras, onClose, onGuardado }) {
  const { updateClase, loading } = useData();
  const d = new Date(clase.fechaHora);
  const [formData, setFormData] = useState({
    // fecha/hora en la zona local del navegador (toISOString daría el día UTC)
    fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hora: d.toTimeString().slice(0, 5),
    empleadoId: String(clase.empleadoId),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateClase(clase.id, {
        // ISO con zona horaria del navegador: la hora escrita = la hora mostrada
        fechaHora: new Date(`${formData.fecha}T${formData.hora}:00`).toISOString(),
        empleadoId: Number(formData.empleadoId),
      });
      await onGuardado();
    } catch (error) { /* toast en DataContext */ }
  };

  const inputStyle = { width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '0.8rem', fontSize: '0.9rem' };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem', width: '90%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>✏️ Editar clase — {PROGRAMAS[clase.programa] || clase.programa}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }} aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Día</label>
          <input type="date" value={formData.fecha} onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))} style={inputStyle} required disabled={loading} />

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Hora</label>
          <input type="time" value={formData.hora} onChange={(e) => setFormData((p) => ({ ...p, hora: e.target.value }))} style={inputStyle} required disabled={loading} />

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Educadora</label>
          <select value={formData.empleadoId} onChange={(e) => setFormData((p) => ({ ...p, empleadoId: e.target.value }))} style={inputStyle} disabled={loading}>
            {educadoras.map((edu) => (
              <option key={edu.id} value={edu.id}>{edu.persona?.nombres || `Empleado ${edu.id}`}</option>
            ))}
          </select>

          <button type="submit" className="btn" style={{ width: '100%', padding: '0.7rem' }} disabled={loading}>
            {loading ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------- RF-08: corporativos "On The Go" ----------
function Corporativos() {
  const { getCorporativos, createCorporativo, updateCorporativo, clases, getClases, loading } = useData();
  const [eventos, setEventos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ empresa: '', contacto: '', fecha: '', numNinos: '' });

  const cargar = useCallback(async () => {
    const data = await getCorporativos();
    if (data) setEventos(data);
  }, [getCorporativos]);

  useEffect(() => {
    cargar();
    getClases(); // para derivar la lista de educadoras
  }, [cargar, getClases]);

  // Educadoras (Empleado) derivadas de las clases existentes
  const educadoras = [];
  for (const c of clases) {
    if (c.empleado && !educadoras.find((e) => e.id === c.empleado.id)) {
      educadoras.push({ id: c.empleado.id, nombres: c.empleado.persona?.nombres || `Empleado ${c.empleado.id}` });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCorporativo({
        empresa: formData.empresa,
        contacto: formData.contacto,
        fecha: formData.fecha,
        numNinos: Number(formData.numNinos),
      });
      setFormData({ empresa: '', contacto: '', fecha: '', numNinos: '' });
      setShowForm(false);
      await cargar();
    } catch (error) {
      // Error ya notificado por toast en DataContext
    }
  };

  const handleAsignar = async (id, educadoraId) => {
    if (!educadoraId) return;
    try {
      await updateCorporativo(id, 'asignar', { educadoraId: Number(educadoraId) });
      await cargar();
    } catch (error) { /* toast en DataContext */ }
  };

  const handleEstado = async (id, estado) => {
    try {
      await updateCorporativo(id, 'estado', { estado });
      await cargar();
    } catch (error) { /* toast en DataContext */ }
  };

  const inputStyle = { width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Servicios corporativos "On The Go"</h3>
        <button className="btn" onClick={() => setShowForm(!showForm)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          {showForm ? 'Cancelar' : '+ Nueva solicitud'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Empresa *</label>
            <input type="text" value={formData.empresa} onChange={(e) => setFormData((p) => ({ ...p, empresa: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="form-group">
            <label>Contacto *</label>
            <input type="text" value={formData.contacto} onChange={(e) => setFormData((p) => ({ ...p, contacto: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" value={formData.fecha} onChange={(e) => setFormData((p) => ({ ...p, fecha: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="form-group">
            <label>N.º de niños *</label>
            <input type="number" min="1" value={formData.numNinos} onChange={(e) => setFormData((p) => ({ ...p, numNinos: e.target.value }))} style={inputStyle} required />
          </div>
          <button type="submit" className="btn" style={{ padding: '0.7rem 1rem', margin: 0 }} disabled={loading}>
            Registrar
          </button>
        </form>
      )}

      {eventos.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No hay solicitudes corporativas registradas</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Empresa</th>
              <th style={{ padding: '0.6rem' }}>Contacto</th>
              <th style={{ padding: '0.6rem' }}>Fecha</th>
              <th style={{ padding: '0.6rem' }}>Niños</th>
              <th style={{ padding: '0.6rem' }}>Educadora</th>
              <th style={{ padding: '0.6rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '0.6rem', fontWeight: 600 }}>{ev.empresa}</td>
                <td style={{ padding: '0.6rem' }}>{ev.contacto}</td>
                <td style={{ padding: '0.6rem' }}>{new Date(ev.fecha).toLocaleDateString('es-EC')}</td>
                <td style={{ padding: '0.6rem' }}>{ev.numNinos}</td>
                <td style={{ padding: '0.6rem' }}>
                  {ev.educadora ? (
                    ev.educadora.persona?.nombres
                  ) : (
                    <select defaultValue="" onChange={(e) => handleAsignar(ev.id, e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <option value="">Asignar...</option>
                      {educadoras.map((edu) => (
                        <option key={edu.id} value={edu.id}>{edu.nombres}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={{ padding: '0.6rem' }}>
                  <select
                    value={ev.estado}
                    onChange={(e) => handleEstado(ev.id, e.target.value)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: `2px solid ${ESTADOS_EVENTO[ev.estado] || '#ccc'}`,
                      color: ESTADOS_EVENTO[ev.estado] || '#333',
                      fontWeight: 600,
                    }}
                  >
                    {Object.keys(ESTADOS_EVENTO).map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Gestión del catálogo de paquetes + prueba gratis por registro ----------
const PAQUETE_VACIO = { nombre: '', tipo: 'mensual', clasesPorSemana: 2, saldoClases: 8, precio: '', duracionDias: '' };

function GestionPaquetes() {
  const {
    getPaquetesCatalogo, createPaqueteCatalogo, updatePaqueteCatalogo, deletePaqueteCatalogo,
    getConfigPrueba, updateConfigPrueba, loading,
  } = useData();
  const [paquetes, setPaquetes] = useState([]);
  const [configPrueba, setConfigPrueba] = useState(null);
  const [form, setForm] = useState(PAQUETE_VACIO);
  const [editandoId, setEditandoId] = useState(null); // null = creando

  const cargar = useCallback(async () => {
    const [catalogo, prueba] = await Promise.all([getPaquetesCatalogo(), getConfigPrueba()]);
    if (catalogo) setPaquetes(catalogo);
    if (prueba) setConfigPrueba(prueba);
  }, [getPaquetesCatalogo, getConfigPrueba]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const empezarEdicion = (p) => {
    setEditandoId(p.id);
    setForm({
      nombre: p.nombre, tipo: p.tipo, clasesPorSemana: p.clasesPorSemana,
      saldoClases: p.saldoClases, precio: p.precio ?? '', duracionDias: p.duracionDias ?? '',
    });
  };

  const cancelarEdicion = () => { setEditandoId(null); setForm(PAQUETE_VACIO); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const datos = {
      nombre: form.nombre,
      tipo: form.tipo,
      clasesPorSemana: Number(form.clasesPorSemana),
      saldoClases: Number(form.saldoClases),
      precio: form.precio === '' ? null : Number(form.precio),
      // Vigencia (RF-03): vacío = el paquete no vence
      duracionDias: form.duracionDias === '' ? null : Number(form.duracionDias),
    };
    try {
      if (editandoId) await updatePaqueteCatalogo(editandoId, datos);
      else await createPaqueteCatalogo(datos);
      cancelarEdicion();
      cargar();
    } catch (err) { /* toast ya mostrado por DataContext */ }
  };

  const toggleActivo = async (p) => {
    try { await updatePaqueteCatalogo(p.id, { activo: !p.activo }); cargar(); }
    catch (err) { /* toast */ }
  };

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" del catálogo? Los paquetes ya contratados por familias NO se ven afectados.`)) return;
    try { await deletePaqueteCatalogo(p.id); cargar(); }
    catch (err) { /* toast */ }
  };

  const guardarPrueba = async () => {
    try {
      const r = await updateConfigPrueba({
        habilitado: configPrueba.habilitado,
        diasPrueba: Number(configPrueba.diasPrueba),
      });
      if (r) setConfigPrueba(r);
    } catch (err) { /* toast */ }
  };

  const inputStyle = { width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-fg)' };

  return (
    <div>
      {/* Prueba gratis por registro */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '8px', border: '2px solid var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>🎈 Prueba gratis por registro</h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Toda familia NUEVA recibe automáticamente clases de prueba gratis al inscribirse (1 por día configurado).
        </p>
        {configPrueba && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={configPrueba.habilitado}
                onChange={(e) => setConfigPrueba((p) => ({ ...p, habilitado: e.target.checked }))}
                style={{ width: '18px', height: '18px' }}
              />
              {configPrueba.habilitado ? 'Habilitada' : 'Deshabilitada'}
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              Días de prueba:
              <input
                type="number" min={1} max={30}
                value={configPrueba.diasPrueba}
                onChange={(e) => setConfigPrueba((p) => ({ ...p, diasPrueba: e.target.value }))}
                disabled={!configPrueba.habilitado}
                style={{ ...inputStyle, width: '80px' }}
              />
            </label>
            <button className="btn" onClick={guardarPrueba} disabled={loading} style={{ width: 'auto', padding: '0.5rem 1.2rem' }}>
              💾 Guardar
            </button>
          </div>
        )}
      </div>

      {/* Crear / editar paquete */}
      <h3 style={{ marginBottom: '0.5rem' }}>{editandoId ? '✏️ Editar paquete' : 'Nuevo paquete del catálogo'}</h3>
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--color-bg)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Nombre *</label>
          <input type="text" name="nombre" value={form.nombre} onChange={handleForm} required style={inputStyle} placeholder="Mensual 2 clases/semana" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Tipo *</label>
          <select name="tipo" value={form.tipo} onChange={handleForm} style={inputStyle}>
            <option value="mensual">Mensual</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Clases/semana *</label>
          <input type="number" name="clasesPorSemana" min={1} max={7} value={form.clasesPorSemana} onChange={handleForm} required style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Clases incluidas *</label>
          <input type="number" name="saldoClases" min={1} value={form.saldoClases} onChange={handleForm} required style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Precio ($)</label>
          <input type="number" name="precio" min={0} step="0.01" value={form.precio} onChange={handleForm} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }} title="Al contratar, el paquete vence a los N días; vacío = no vence">Duración (días)</label>
          <input type="number" name="duracionDias" min={1} max={365} value={form.duracionDias} onChange={handleForm} style={inputStyle} placeholder="no vence" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn" disabled={loading} style={{ width: 'auto', padding: '0.6rem 1rem' }}>
            {editandoId ? '💾 Guardar' : '➕ Agregar'}
          </button>
          {editandoId && (
            <button type="button" onClick={cancelarEdicion} style={{ padding: '0.6rem 1rem', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'transparent', color: 'var(--color-fg)', fontWeight: 600 }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Catálogo */}
      <h3 style={{ marginBottom: '1rem' }}>Catálogo actual</h3>
      {paquetes.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>
          Aún no hay paquetes en el catálogo — crea el primero arriba
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem' }}>Nombre</th>
                <th style={{ padding: '0.6rem' }}>Tipo</th>
                <th style={{ padding: '0.6rem' }}>Clases/semana</th>
                <th style={{ padding: '0.6rem' }}>Clases incluidas</th>
                <th style={{ padding: '0.6rem' }}>Precio</th>
                <th style={{ padding: '0.6rem' }}>Duración</th>
                <th style={{ padding: '0.6rem' }}>Estado</th>
                <th style={{ padding: '0.6rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {paquetes.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: p.activo ? 1 : 0.55 }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ padding: '0.6rem', textTransform: 'capitalize' }}>{p.tipo}</td>
                  <td style={{ padding: '0.6rem' }}>{p.clasesPorSemana}</td>
                  <td style={{ padding: '0.6rem' }}>{p.saldoClases}</td>
                  <td style={{ padding: '0.6rem' }}>{p.precio != null ? `$${p.precio}` : '—'}</td>
                  <td style={{ padding: '0.6rem' }}>{p.duracionDias != null ? `${p.duracionDias} días` : 'No vence'}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '999px', color: p.activo ? 'var(--color-success)' : 'var(--color-danger)', border: `1px solid ${p.activo ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem', whiteSpace: 'nowrap' }}>
                    <button onClick={() => empezarEdicion(p)} title="Editar" style={{ marginRight: '0.4rem', padding: '0.3rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => toggleActivo(p)} title={p.activo ? 'Desactivar (dejar de ofrecer)' : 'Reactivar'} style={{ marginRight: '0.4rem', padding: '0.3rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}>
                      {p.activo ? '⏸' : '▶'}
                    </button>
                    <button onClick={() => eliminar(p)} title="Eliminar del catálogo" style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
