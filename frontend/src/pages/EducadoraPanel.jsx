// T21 — Panel Educadora (RF-04 asistencia, RF-05 progreso / HF-4, HF-5)
// Wireframe 4 del Avance 7: lista de clase + registro de asistencia + progreso
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { toast } from 'react-toastify';

const PROGRAMAS = {
  PLAY_LEARN: '🎨 Play & Learn',
  MUSIC: '🎵 Music',
  ART: '🖼️ Art',
  SCHOOL_SKILLS: '📚 School Skills',
  PLAYLAB: '🧪 PlayLab',
};

// RF-04: estados válidos de asistencia (HF-4)
const ESTADOS_ASISTENCIA = [
  { valor: 'ASISTIO', etiqueta: '✅ Asistió', color: '#27ae60' },
  { valor: 'FALTO', etiqueta: '❌ Faltó', color: '#e74c3c' },
  { valor: 'CLASE_PRUEBA', etiqueta: '🎈 Clase de prueba', color: '#f39c12' },
];

// RF-05: áreas de desarrollo válidas
const AREAS = ['motor', 'cognitivo', 'social', 'emocional'];

export function EducadoraPanel() {
  const { rol } = useAuth();
  const { clases, getClases } = useData();
  const [claseId, setClaseId] = useState(null);
  // El backend ya filtra: una EDUCADORA solo recibe SUS clases;
  // Recepción y Propietaria reciben las de todas las educadoras.
  const esEducadora = rol === 'EDUCADORA';

  useEffect(() => {
    getClases();
  }, [getClases]);

  const formatHorario = (c) => {
    const d = new Date(c.fechaHora);
    return `${d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Agrupar las clases por educadora (empleado que las imparte)
  const educadoras = [];
  for (const clase of clases) {
    const nombre = clase.empleado?.persona?.nombres || 'Sin asignar';
    let grupo = educadoras.find((e) => e.nombre === nombre);
    if (!grupo) {
      grupo = { nombre, clases: [] };
      educadoras.push(grupo);
    }
    grupo.clases.push(clase);
  }

  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            👩‍🏫 Panel de Educadora
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Lista de clase, registro de asistencia y progreso de los niños
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {esEducadora ? 'Mis clases asignadas' : 'Educadoras y sus clases asignadas'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {educadoras.map((edu) => (
              <div
                key={edu.nombre}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ backgroundColor: '#667eea', color: 'white', padding: '0.8rem 1rem', fontWeight: 600 }}>
                  👩‍🏫 {edu.nombre}
                  <span style={{ float: 'right', fontWeight: 400, fontSize: '0.85rem' }}>
                    {edu.clases.length} clase{edu.clases.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ padding: '0.8rem' }}>
                  {edu.clases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setClaseId(c.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        // programa + horario no caben en una línea en teléfono:
                        // se apilan en vez de desbordar la tarjeta
                        flexWrap: 'wrap',
                        gap: '0.25rem 0.6rem',
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        marginBottom: '0.4rem',
                        backgroundColor: claseId === c.id ? '#667eea' : '#f5f6ff',
                        color: claseId === c.id ? 'white' : '#333',
                        border: claseId === c.id ? '1px solid #667eea' : '1px solid #e0e3ff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textAlign: 'left',
                      }}
                    >
                      <span>{PROGRAMAS[c.programa] || c.programa}</span>
                      <span style={{ opacity: 0.8 }}>{formatHorario(c)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {claseId ? (
            <ListaDeClase claseId={claseId} />
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '2rem', borderTop: '1px solid #eee' }}>
              Haz clic en una clase para ver su lista de niños
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Lista de clase: niños con reserva ACTIVA + su asistencia registrada
function ListaDeClase({ claseId }) {
  const { getClase, getAsistencias, createAsistencia } = useData();
  const [clase, setClase] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [ninoProgreso, setNinoProgreso] = useState(null);

  const cargar = useCallback(async () => {
    const [claseData, asistenciasData] = await Promise.all([
      getClase(claseId),
      getAsistencias(claseId),
    ]);
    if (claseData) setClase(claseData);
    if (asistenciasData) setAsistencias(asistenciasData);
  }, [claseId, getClase, getAsistencias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleAsistencia = async (ninoId, estado) => {
    try {
      await createAsistencia({ ninoId, claseId, estado });
      await cargar();
    } catch (error) {
      // Error ya notificado por toast en DataContext
    }
  };

  if (!clase) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando lista de clase...</p>
      </div>
    );
  }

  const ninos = (clase.reservas || []).map((r) => r.nino);
  const asistenciaDe = (ninoId) => asistencias.find((a) => a.nino?.id === ninoId || a.ninoId === ninoId);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f0f4ff',
          borderRadius: '6px',
        }}
      >
        <div>
          <strong>{PROGRAMAS[clase.programa] || clase.programa}</strong>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Educadora: {clase.empleado?.persona?.nombres || 'No asignada'}
          </p>
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          Cupo: {ninos.length} / {clase.cupoMaximo}
        </span>
      </div>

      {ninos.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
          No hay niños con reserva activa en esta clase
        </p>
      ) : (
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Niño</th>
              <th style={{ padding: '0.75rem' }}>Asistencia</th>
              <th style={{ padding: '0.75rem' }}>Registrado el</th>
              <th style={{ padding: '0.75rem' }}>Progreso</th>
            </tr>
          </thead>
          <tbody>
            {ninos.map((nino) => {
              const asistencia = asistenciaDe(nino.id);
              const estadoInfo = ESTADOS_ASISTENCIA.find((e) => e.valor === asistencia?.estado);
              return (
                <tr key={nino.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{nino.nombres}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {asistencia ? (
                      <span style={{ color: estadoInfo?.color, fontWeight: 600 }}>
                        {estadoInfo?.etiqueta || asistencia.estado}
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {ESTADOS_ASISTENCIA.map((e) => (
                          <button
                            key={e.valor}
                            onClick={() => handleAsistencia(nino.id, e.valor)}
                            style={{
                              padding: '0.4rem 0.7rem',
                              backgroundColor: e.color,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}
                          >
                            {e.etiqueta}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
                    {asistencia
                      ? new Date(asistencia.fecha).toLocaleString('es-EC', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => setNinoProgreso(nino)}
                      style={{
                        padding: '0.4rem 0.7rem',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      📈 Registrar progreso
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {ninoProgreso && (
        <ProgresoModal nino={ninoProgreso} onClose={() => setNinoProgreso(null)} />
      )}
    </div>
  );
}

// Ventana emergente: registrar observación de progreso + historial (RF-05)
function ProgresoModal({ nino, onClose }) {
  const { getProgresos, createProgreso, loading } = useData();
  const [historial, setHistorial] = useState([]);
  const [area, setArea] = useState('');
  const [observacion, setObservacion] = useState('');

  const cargarHistorial = useCallback(async () => {
    const data = await getProgresos(nino.id);
    if (data) setHistorial(data);
  }, [nino.id, getProgresos]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!area || !observacion.trim()) {
      toast.warning('Selecciona el área y escribe la observación');
      return;
    }
    try {
      await createProgreso({ ninoId: nino.id, area, observacion });
      setArea('');
      setObservacion('');
      await cargarHistorial();
    } catch (error) {
      // Error ya notificado por toast en DataContext
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '1.5rem',
          width: '90%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📈 Progreso de {nino.nombres}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Área de desarrollo:
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '0.8rem',
              fontSize: '0.9rem',
            }}
            disabled={loading}
          >
            <option value="">-- Selecciona el área --</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Observación:
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            placeholder="Describe el avance observado en la clase de hoy..."
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '0.8rem',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
            disabled={loading}
          />

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.7rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
            disabled={loading}
          >
            {loading ? 'Guardando...' : '💾 Guardar observación'}
          </button>
        </form>

        <h4 style={{ marginBottom: '0.8rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          Historial de observaciones
        </h4>
        {historial.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Aún no hay observaciones registradas</p>
        ) : (
          historial.map((p) => (
            <div
              key={p.id}
              style={{
                padding: '0.8rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                borderLeft: '3px solid #667eea',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.area}</span>
                <span>{new Date(p.fecha).toLocaleDateString('es-EC')}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{p.observacion}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
