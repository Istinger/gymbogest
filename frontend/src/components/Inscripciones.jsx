import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const CANALES = ['REDES', 'PEDIATRA_ALIADO', 'EMPRESA', 'REFERIDO'];
const PARENTESCOS = ['padre', 'madre', 'abuelo', 'abuela', 'otro'];

// Normaliza para buscar sin acentos ni mayúsculas ("María" ≈ "maria")
const normalizar = (texto) =>
  (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Un niño en la lista (reutilizado en la tabla y en el modal de familia numerosa)
function NinoItem({ nino }) {
  return (
    <div style={{ marginBottom: '0.2rem', opacity: nino.activo === false ? 0.55 : 1 }}>
      🧒 {nino.nombres}
      {nino.activo === false && (
        <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: '999px', padding: '0 0.5rem' }}>
          inactivo
        </span>
      )}
    </div>
  );
}

export function Inscripciones() {
  const { familias, loading, getFamilias, createFamilia } = useData();
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(10); // últimos N registrados (5, 10 o todas)
  const [familiaEditar, setFamiliaEditar] = useState(null); // extensión CU-01: corregir typos
  const [familiaPaquetes, setFamiliaPaquetes] = useState(null); // extensión RF-03: contratar/ver paquetes
  const [ninosDe, setNinosDe] = useState(null); // familia numerosa (>3): modal con todos sus niños
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
                <th style={{ padding: '1rem', textAlign: 'left' }}>Paquete</th>
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
                        // ≤3 niños: se listan inline. >3: chip que abre el modal (fila compacta y uniforme)
                        familia.ninos.length <= 3 ? (
                          familia.ninos.map((nino) => <NinoItem key={nino.id} nino={nino} />)
                        ) : (
                          <button
                            onClick={() => setNinosDe(familia)}
                            title="Ver todos los niños de la familia"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: '999px', background: 'var(--color-accent-soft)', color: 'var(--color-fg)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            👨‍👩‍👧 Ver los {familia.ninos.length} niños
                          </button>
                        )
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
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {/* Solo LECTURA para Recepción: el ajuste de saldo es de la Propietaria */}
                      {familia.paquetes?.length ? (
                        familia.paquetes.map((p) => (
                          <div key={p.id} style={{ marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>
                            {p.tipo === 'PRUEBA_GRATIS' ? (
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-brand, #B45309)', border: '1px solid currentColor', borderRadius: '999px', padding: '0 0.45rem', marginRight: '0.35rem' }}>PRUEBA</span>
                            ) : (
                              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p.tipo} · </span>
                            )}
                            {p.saldoClases} clase{p.saldoClases !== 1 ? 's' : ''}
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#999' }}>Sin paquete</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setFamiliaPaquetes(familia)}
                        title="Contratar un paquete del catálogo para esta familia"
                        style={{ padding: '0.4rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg)', color: 'var(--color-fg)', fontSize: '0.85rem', fontWeight: 600, marginRight: '0.4rem' }}
                      >
                        📦 Paquetes
                      </button>
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

      {familiaPaquetes && (
        <PaquetesFamiliaModal
          familia={familiaPaquetes}
          onClose={() => setFamiliaPaquetes(null)}
          onGuardado={() => { setFamiliaPaquetes(null); getFamilias(); }}
        />
      )}

      {ninosDe && (
        <NinosFamiliaModal familia={ninosDe} onClose={() => setNinosDe(null)} />
      )}
    </div>
  );
}

// Modal de solo lectura: lista completa de niños de una familia numerosa (>3).
function NinosFamiliaModal({ familia, onClose }) {
  const tutor = familia.tutores?.[0];
  const activos = familia.ninos.filter((n) => n.activo !== false).length;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <h3 style={{ margin: 0 }}>👨‍👩‍👧 Niños de la familia</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }} aria-label="Cerrar">✕</button>
        </div>
        {tutor && (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'capitalize' }}>
            Tutor: {tutor.persona?.nombres} ({tutor.parentesco})
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {familia.ninos.map((nino) => <NinoItem key={nino.id} nino={nino} />)}
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
          Total: {familia.ninos.length} niños · {activos} activo{activos !== 1 ? 's' : ''}
        </p>
      </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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

// Extensión RF-03: paquetes de una familia.
// Recepción CONTRATA del catálogo activo (los valores se copian de la plantilla,
// pago opcional) y VE los contratados; el ajuste manual de saldo es SOLO de la
// PROPIETARIA (el saldo es dinero en especie — el backend da 403 al resto).
function PaquetesFamiliaModal({ familia, onClose, onGuardado }) {
  const { rol } = useAuth();
  const { getPaquetesCatalogo, contratarPaquete, ajustarPaquete, loading } = useData();
  const esPropietaria = rol === 'PROPIETARIA';

  const [catalogo, setCatalogo] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [conPago, setConPago] = useState(false);
  const [saldos, setSaldos] = useState({}); // ajustes de la Propietaria: paqueteId → saldo

  useEffect(() => {
    getPaquetesCatalogo().then((data) => {
      // la API ya limita a activos para Recepción; se filtra igual por si el rol es Propietaria
      setCatalogo((data || []).filter((p) => p.activo));
    });
  }, [getPaquetesCatalogo]);

  const plantilla = catalogo.find((p) => p.id === Number(seleccion));
  const sinPrecio = plantilla && (plantilla.precio === null || plantilla.precio === undefined);

  const handleContratar = async (e) => {
    e.preventDefault();
    if (!seleccion) return;
    try {
      await contratarPaquete(familia.id, { paqueteCatalogoId: Number(seleccion), conPago });
      onGuardado();
    } catch (err) {
      // Error ya notificado por toast en DataContext
    }
  };

  const handleAjustar = async (paquete) => {
    const nuevoSaldo = saldos[paquete.id];
    if (nuevoSaldo === undefined || Number(nuevoSaldo) === paquete.saldoClases) return;
    try {
      await ajustarPaquete(paquete.id, { saldoClases: Number(nuevoSaldo) });
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
          <h3 style={{ margin: 0 }}>📦 Paquetes de la familia</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }} aria-label="Cerrar">✕</button>
        </div>

        {/* Paquetes contratados: Recepción solo LEE; la Propietaria ajusta el saldo */}
        <h4 style={{ marginBottom: '0.6rem' }}>Contratados</h4>
        {familia.paquetes?.length ? (
          familia.paquetes.map((p) => (
            <div
              key={p.id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.5rem 0.7rem', border: '1px solid var(--color-border)', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.9rem' }}
            >
              <span style={{ flex: 1, textTransform: 'capitalize', fontWeight: 600 }}>
                {p.tipo === 'PRUEBA_GRATIS' ? '🎁 Prueba gratis' : p.tipo}
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-muted, #888)' }}>
                  {p.clasesPorSemana} clase{p.clasesPorSemana !== 1 ? 's' : ''}/semana
                  {p.fechaVencimiento && (
                    new Date(p.fechaVencimiento) < new Date()
                      ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}> · ⛔ vencido el {new Date(p.fechaVencimiento).toLocaleDateString('es-EC')}</span>
                      : <span> · vence {new Date(p.fechaVencimiento).toLocaleDateString('es-EC')}</span>
                  )}
                </span>
              </span>
              {esPropietaria ? (
                <>
                  <label style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    Saldo
                    <input
                      type="number"
                      min="0"
                      value={saldos[p.id] ?? p.saldoClases}
                      onChange={(e) => setSaldos((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      disabled={loading}
                      style={{ width: '4.5rem', minHeight: '38px', padding: '0 0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-fg)' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAjustar(p)}
                    disabled={loading || saldos[p.id] === undefined || Number(saldos[p.id]) === p.saldoClases}
                    title="Ajuste manual del saldo (queda auditado)"
                    style={{ padding: '0.35rem 0.7rem', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg)', color: 'var(--color-fg)', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Ajustar
                  </button>
                </>
              ) : (
                <span
                  title="El saldo lo mueve el sistema al reservar/cancelar; el ajuste manual es solo de la Propietaria"
                  style={{ fontWeight: 700 }}
                >
                  {p.saldoClases} clase{p.saldoClases !== 1 ? 's' : ''} 🔒
                </span>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Esta familia aún no tiene paquetes.</p>
        )}
        {!esPropietaria && familia.paquetes?.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted, #888)', marginTop: '-0.2rem' }}>
            🔒 El saldo solo puede ajustarlo la Propietaria.
          </p>
        )}

        {/* Contratar del catálogo (Recepción y Propietaria) */}
        <h4 style={{ margin: '1.2rem 0 0.6rem' }}>Contratar del catálogo</h4>
        {catalogo.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.9rem' }}>
            No hay paquetes activos en el catálogo. La Propietaria los crea en su panel (📦 Paquetes).
          </p>
        ) : (
          <form onSubmit={handleContratar}>
            <div className="form-group">
              <label>Paquete</label>
              <select
                value={seleccion}
                onChange={(e) => { setSeleccion(e.target.value); setConPago(false); }}
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-fg)' }}
              >
                <option value="">— Elegir del catálogo —</option>
                {catalogo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.saldoClases} clases ({p.clasesPorSemana}/sem)
                    {p.precio != null ? ` · $${p.precio}` : ''}
                    {p.duracionDias != null ? ` · ${p.duracionDias} días` : ''}
                  </option>
                ))}
              </select>
            </div>
            <label
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: '0.3rem 0 0.8rem', opacity: sinPrecio ? 0.5 : 1 }}
              title={sinPrecio ? 'Este paquete no tiene precio en el catálogo: registra el pago por separado' : ''}
            >
              <input
                type="checkbox"
                checked={conPago}
                onChange={(e) => setConPago(e.target.checked)}
                disabled={loading || !plantilla || sinPrecio}
              />
              Registrar el pago ahora{plantilla?.precio != null ? ` ($${plantilla.precio}, comprobante Dátil)` : ''}
            </label>
            <button type="submit" className="btn" disabled={loading || !seleccion}>
              {loading ? 'Contratando...' : 'Contratar paquete'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
