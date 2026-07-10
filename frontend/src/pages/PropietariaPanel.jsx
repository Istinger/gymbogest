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

      <h3 style={{ marginBottom: '1rem' }}>Clases programadas</h3>

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
