import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const CANALES = ['REDES', 'PEDIATRA_ALIADO', 'EMPRESA', 'REFERIDO'];
const PARENTESCOS = ['padre', 'madre', 'abuelo', 'abuela', 'otro'];

// Normaliza para buscar sin acentos ni mayúsculas ("María" ≈ "maria")
const normalizar = (texto) =>
  (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function Inscripciones() {
  const { familias, loading, getFamilias, createFamilia } = useData();
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(10); // últimos N registrados (5, 10 o todas)
  const [familiaEditar, setFamiliaEditar] = useState(null); // extensión CU-01: corregir typos
  const [formData, setFormData] = useState({
    nombreTutor: '',
    cedulaTutor: '',
    correoTutor: '',
    telefonoTutor: '',
    parentesco: 'madre',
    nombreNino: '',
    fechaNacimiento: '',
    canalOrigen: 'REDES',
  });

  useEffect(() => {
    getFamilias();
  }, [getFamilias]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const cedulaRegistrada = formData.cedulaTutor;
      await createFamilia({
        tutor: {
          nombres: formData.nombreTutor,
          cedula: formData.cedulaTutor,
          correo: formData.correoTutor,
          telefono: formData.telefonoTutor,
          parentesco: formData.parentesco,
        },
        nino: {
          nombres: formData.nombreNino,
          fechaNacimiento: new Date(formData.fechaNacimiento),
        },
        canalOrigen: formData.canalOrigen,
      });

      // Mostrar de inmediato la familia afectada: si la cédula ya existía, el niño
      // se asoció a una familia VIEJA que puede estar fuera de los "últimos 10" —
      // filtrar por cédula garantiza que se vea, sea familia nueva o existente.
      setBusqueda(cedulaRegistrada);

      setFormData({
        nombreTutor: '',
        cedulaTutor: '',
        correoTutor: '',
        telefonoTutor: '',
        parentesco: 'madre',
        nombreNino: '',
        fechaNacimiento: '',
        canalOrigen: 'REDES',
      });
      setShowForm(false);
      getFamilias();
    } catch (err) {
      // Error ya manejado por toast en DataContext
    }
  };

  // Filtro por tutor, niño o cédula sobre TODAS las familias.
  // Sin búsqueda: solo los últimos N registrados (la API ya ordena por fecha desc).
  const termino = normalizar(busqueda.trim());
  const familiasFiltradas = termino
    ? familias.filter((f) =>
        f.tutores?.some((t) =>
          normalizar(t.persona?.nombres).includes(termino)
          || (t.persona?.cedula || '').includes(termino))
        || f.ninos?.some((n) => normalizar(n.nombres).includes(termino)))
    : (limite === 'todas' ? familias : familias.slice(0, limite));

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Inscripciones de Familias</h3>
        <button className="btn" onClick={() => setShowForm(!showForm)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          {showForm ? 'Cancelar' : '+ Nueva Inscripción'}
        </button>
      </div>

      {/* Buscador + límite de recientes */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por tutor, niño o cédula…"
          aria-label="Buscar familias por tutor, niño o cédula"
          style={{
            flex: '1 1 260px',
            minHeight: '44px',
            padding: '0 0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-fg)',
            fontSize: '1rem',
          }}
        />
        {!termino && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-muted)' }}>
            Mostrar últimos
            <select
              value={limite}
              onChange={(e) => setLimite(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
              style={{ minHeight: '44px', padding: '0 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-fg)' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value="todas">Todas</option>
            </select>
          </label>
        )}
        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          {termino
            ? `${familiasFiltradas.length} resultado${familiasFiltradas.length !== 1 ? 's' : ''} de ${familias.length}`
            : `Mostrando ${familiasFiltradas.length} de ${familias.length} familias (más recientes primero)`}
        </span>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nombre Tutor *</label>
              <input type="text" name="nombreTutor" value={formData.nombreTutor} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Cédula Tutor *</label>
              <input type="text" name="cedulaTutor" value={formData.cedulaTutor} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Correo Tutor *</label>
              <input type="email" name="correoTutor" value={formData.correoTutor} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Teléfono Tutor</label>
              <input type="tel" name="telefonoTutor" value={formData.telefonoTutor} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Parentesco *</label>
              <select name="parentesco" value={formData.parentesco} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                {PARENTESCOS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre Hijo *</label>
              <input type="text" name="nombreNino" value={formData.nombreNino} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Fecha Nacimiento *</label>
              <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Canal de Origen *</label>
              <select name="canalOrigen" value={formData.canalOrigen} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                {CANALES.map((canal) => (
                  <option key={canal} value={canal}>
                    {canal}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
            Registrar Familia
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : familias.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#999' }}>
          <p>No hay familias registradas</p>
        </div>
      ) : familiasFiltradas.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#999' }}>
          <p>Sin resultados para «{busqueda.trim()}» — revisa el nombre o la cédula</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Niños</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Tutor a cargo</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Cédula</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Contacto</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Canal</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}></th>
              </tr>
            </thead>
            <tbody>
              {familiasFiltradas.map((familia) => {
                const tutor = familia.tutores?.[0];
                return (
                  <tr key={familia.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>
                      {familia.ninos?.length ? (
                        familia.ninos.map((nino) => (
                          <div
                            key={nino.id}
                            style={{
                              marginBottom: '0.2rem',
                              opacity: nino.activo === false ? 0.55 : 1,
                            }}
                          >
                            🧒 {nino.nombres}
                            {nino.activo === false && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: '999px', padding: '0 0.5rem' }}>
                                inactivo
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#999' }}>Sin niños</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {tutor ? (
                        <>
                          {tutor.persona?.nombres}
                          <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'capitalize' }}>
                            ({tutor.parentesco})
                          </div>
                        </>
                      ) : 'Sin tutor'}
                    </td>
                    <td style={{ padding: '1rem' }}>{tutor?.persona?.cedula || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {tutor?.persona?.correo || '-'}
                      <div style={{ color: '#888' }}>{tutor?.persona?.telefono || ''}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{familia.canalOrigen}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => setFamiliaEditar(familia)}
                        title="Corregir datos de la inscripción"
                        style={{ padding: '0.4rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg)', color: 'var(--color-fg)', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {familiaEditar && (
        <EditarFamiliaModal
          familia={familiaEditar}
          onClose={() => setFamiliaEditar(null)}
          onGuardado={() => { setFamiliaEditar(null); getFamilias(); }}
        />
      )}
    </div>
  );
}

// Extensión CU-01: corregir typos de la inscripción (tutor + niños).
// La cédula solo la puede corregir la PROPIETARIA (clave de identidad, T05).
function EditarFamiliaModal({ familia, onClose, onGuardado }) {
  const { rol } = useAuth();
  const { updateTutor, updateNino, loading } = useData();
  const tutor = familia.tutores?.[0];
  const puedeEditarCedula = rol === 'PROPIETARIA';

  const [datosTutor, setDatosTutor] = useState({
    nombres: tutor?.persona?.nombres || '',
    cedula: tutor?.persona?.cedula || '',
    correo: tutor?.persona?.correo || '',
    telefono: tutor?.persona?.telefono || '',
    parentesco: tutor?.parentesco || 'madre',
  });
  const [datosNinos, setDatosNinos] = useState(
    (familia.ninos || []).map((n) => ({
      id: n.id,
      nombres: n.nombres,
      fechaNacimiento: n.fechaNacimiento?.split('T')[0] || '',
      activo: n.activo !== false, // baja suave: default true si el campo no viene
    })),
  );

  const handleNino = (id, campo, valor) => {
    setDatosNinos((prev) => prev.map((n) => (n.id === id ? { ...n, [campo]: valor } : n)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (tutor) {
        const cambios = {
          nombres: datosTutor.nombres,
          correo: datosTutor.correo,
          telefono: datosTutor.telefono,
          parentesco: datosTutor.parentesco,
        };
        // La cédula solo viaja si cambió Y el rol lo permite (el backend igual lo re-verifica)
        if (puedeEditarCedula && datosTutor.cedula !== tutor.persona?.cedula) {
          cambios.cedula = datosTutor.cedula;
        }
        await updateTutor(tutor.id, cambios);
      }
      for (const nino of datosNinos) {
        const original = familia.ninos.find((n) => n.id === nino.id);
        const activoOriginal = original.activo !== false;
        if (nino.nombres !== original.nombres
            || nino.fechaNacimiento !== (original.fechaNacimiento?.split('T')[0] || '')
            || nino.activo !== activoOriginal) {
          await updateNino(nino.id, {
            nombres: nino.nombres,
            fechaNacimiento: nino.fechaNacimiento,
            activo: nino.activo,
          });
        }
      }
      onGuardado();
    } catch (err) {
      // Error ya notificado por toast en DataContext
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem', width: '90%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>✏️ Corregir inscripción</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }} aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {tutor && (
            <>
              <h4 style={{ marginBottom: '0.8rem' }}>Tutor</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={datosTutor.nombres} onChange={(e) => setDatosTutor((p) => ({ ...p, nombres: e.target.value }))} required disabled={loading} />
                </div>
                <div className="form-group">
                  <label>Cédula {!puedeEditarCedula && '(solo Propietaria)'}</label>
                  <input
                    type="text"
                    value={datosTutor.cedula}
                    onChange={(e) => setDatosTutor((p) => ({ ...p, cedula: e.target.value }))}
                    disabled={loading || !puedeEditarCedula}
                    title={puedeEditarCedula ? '' : 'La cédula es la clave de identidad: solo la Propietaria puede corregirla'}
                  />
                </div>
                <div className="form-group">
                  <label>Correo</label>
                  <input type="email" value={datosTutor.correo} onChange={(e) => setDatosTutor((p) => ({ ...p, correo: e.target.value }))} required disabled={loading} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={datosTutor.telefono} onChange={(e) => setDatosTutor((p) => ({ ...p, telefono: e.target.value }))} disabled={loading} />
                </div>
                <div className="form-group">
                  <label>Parentesco</label>
                  <select value={datosTutor.parentesco} onChange={(e) => setDatosTutor((p) => ({ ...p, parentesco: e.target.value }))} disabled={loading} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-fg)' }}>
                    {PARENTESCOS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {datosNinos.length > 0 && (
            <>
              <h4 style={{ margin: '1rem 0 0.8rem' }}>Niños</h4>
              {datosNinos.map((nino) => (
                <div
                  key={nino.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '0.8rem',
                    alignItems: 'end',
                    opacity: nino.activo ? 1 : 0.6,
                  }}
                >
                  <div className="form-group">
                    <label>Nombre {!nino.activo && '(inactivo)'}</label>
                    <input type="text" value={nino.nombres} onChange={(e) => handleNino(nino.id, 'nombres', e.target.value)} required disabled={loading} />
                  </div>
                  <div className="form-group">
                    <label>Fecha de nacimiento</label>
                    <input type="date" value={nino.fechaNacimiento} onChange={(e) => handleNino(nino.id, 'fechaNacimiento', e.target.value)} required disabled={loading} />
                  </div>
                  <div className="form-group">
                    {/* Baja suave: no borra el historial (LOPDP); inactivo no puede reservar */}
                    <button
                      type="button"
                      onClick={() => handleNino(nino.id, 'activo', !nino.activo)}
                      disabled={loading}
                      title={nino.activo
                        ? 'Dar de baja: conserva su historial pero no podrá reservar clases'
                        : 'Reactivar: vuelve a poder reservar clases'}
                      style={{
                        minHeight: '44px',
                        padding: '0 0.9rem',
                        borderRadius: '6px',
                        border: `1px solid ${nino.activo ? 'var(--color-danger)' : 'var(--color-success)'}`,
                        background: 'transparent',
                        color: nino.activo ? 'var(--color-danger)' : 'var(--color-success)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nino.activo ? '⏸ Dar de baja' : '▶ Reactivar'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <button type="submit" className="btn" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar correcciones'}
          </button>
        </form>
      </div>
    </div>
  );
}
