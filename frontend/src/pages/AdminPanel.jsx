// RNF-01 — Panel de Administración (rol ADMIN, separado de la operación)
// Gestión de cuentas (crear/editar correos, contraseñas, nombres y roles
// operativos) + bitácora de ingresos al sistema. Los roles ADMIN y
// PROPIETARIA están protegidos: el backend rechaza cambiarlos (403).
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useData } from '../contexts/DataContext';
import { toast } from 'react-toastify';

// Solo roles operativos: ADMIN y PROPIETARIA no se asignan desde aquí
const ROLES_ASIGNABLES = ['RECEPCION', 'EDUCADORA', 'TUTOR'];
const ROLES_PROTEGIDOS = ['ADMIN', 'PROPIETARIA'];

const ROL_COLORES = {
  ADMIN: '#2c3e50',
  PROPIETARIA: '#8e44ad',
  RECEPCION: '#2980b9',
  EDUCADORA: '#27ae60',
  TUTOR: '#e67e22',
};

export function AdminPanel() {
  const [seccion, setSeccion] = useState('usuarios');

  const tabs = [
    { id: 'usuarios', label: '👥 Cuentas de usuario' },
    { id: 'accesos', label: '🔑 Logs de ingreso' },
  ];

  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            🛡️ Panel de Administración
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Gestión de cuentas, roles y bitácora de ingresos al sistema
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id)}
              style={{
                padding: '0.7rem 1.4rem',
                backgroundColor: seccion === tab.id ? '#2c3e50' : 'white',
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
          {seccion === 'usuarios' && <AdminUsuarios />}
          {seccion === 'accesos' && <LogsIngreso />}
        </div>
      </div>
    </Layout>
  );
}

// ---------- Gestión de cuentas ----------
function AdminUsuarios() {
  const { getUsuarios, createUsuario, loading } = useData();
  const [usuarios, setUsuarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nombres: '', cedula: '', telefono: '', correo: '', password: '', rol: 'TUTOR' });

  const cargar = useCallback(async () => {
    const data = await getUsuarios();
    if (data) setUsuarios(data);
  }, [getUsuarios]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await createUsuario(formData);
      setFormData({ nombres: '', cedula: '', telefono: '', correo: '', password: '', rol: 'TUTOR' });
      setShowForm(false);
      await cargar();
    } catch (error) { /* toast en DataContext */ }
  };

  const inputStyle = { width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Cuentas de usuario</h3>
        <button className="btn" onClick={() => setShowForm(!showForm)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          {showForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Los roles <strong>ADMIN</strong> y <strong>PROPIETARIA</strong> están protegidos: no pueden
        asignarse ni cambiarse desde aquí. Las cuentas del registro público entran como TUTOR.
      </p>

      {showForm && (
        <form onSubmit={handleCrear} style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Nombre *</label>
            <input type="text" value={formData.nombres} onChange={(e) => setFormData((p) => ({ ...p, nombres: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="form-group">
            <label>Cédula * (10 dígitos)</label>
            <input type="text" value={formData.cedula} onChange={(e) => setFormData((p) => ({ ...p, cedula: e.target.value }))} style={inputStyle} required pattern="\d{10}" title="La cédula debe tener 10 dígitos" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input type="tel" value={formData.telefono} onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
          </div>
          <div className="form-group">
            <label>Correo *</label>
            <input type="email" value={formData.correo} onChange={(e) => setFormData((p) => ({ ...p, correo: e.target.value }))} style={inputStyle} required />
          </div>
          <div className="form-group">
            <label>Contraseña *</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} style={inputStyle} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Rol *</label>
            <select value={formData.rol} onChange={(e) => setFormData((p) => ({ ...p, rol: e.target.value }))} style={inputStyle}>
              {ROLES_ASIGNABLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" className="btn" style={{ padding: '0.7rem 1rem', margin: 0 }} disabled={loading}>
            Crear
          </button>
        </form>
      )}

      <div className="table-wrap">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '0.6rem' }}>Nombre</th>
            <th style={{ padding: '0.6rem' }}>Correo</th>
            <th style={{ padding: '0.6rem' }}>Rol</th>
            <th style={{ padding: '0.6rem' }}>Creado</th>
            <th style={{ padding: '0.6rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '0.6rem' }}>{u.persona?.nombres || <span style={{ color: '#bbb' }}>Sin persona</span>}</td>
              <td style={{ padding: '0.6rem' }}>{u.correo}</td>
              <td style={{ padding: '0.6rem' }}>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: `${ROL_COLORES[u.rol]}18`, color: ROL_COLORES[u.rol] || '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                  {ROLES_PROTEGIDOS.includes(u.rol) ? '🔒 ' : ''}{u.rol}
                </span>
              </td>
              <td style={{ padding: '0.6rem', fontSize: '0.85rem', color: '#888' }}>
                {new Date(u.creadoEn).toLocaleDateString('es-EC')}
              </td>
              <td style={{ padding: '0.6rem' }}>
                <button
                  onClick={() => setEditando(u)}
                  style={{ padding: '0.4rem 0.8rem', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  ✏️ Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          onClose={() => setEditando(null)}
          onGuardado={async () => { setEditando(null); await cargar(); }}
        />
      )}
    </div>
  );
}

// Ventana emergente: editar correo, nombre, contraseña y rol operativo
function EditarUsuarioModal({ usuario, onClose, onGuardado }) {
  const { updateUsuario, loading } = useData();
  const rolProtegido = ROLES_PROTEGIDOS.includes(usuario.rol);
  const sinPersona = !usuario.persona; // el nombre vive en Persona: si no hay, se crea (pide cédula)
  const [formData, setFormData] = useState({
    nombres: usuario.persona?.nombres || '',
    cedula: '',
    correo: usuario.correo,
    rol: usuario.rol,
    password: '', // vacío = no cambiar
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password.length < 6) {
      toast.warning('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (sinPersona && formData.nombres && !/^\d{10}$/.test(formData.cedula)) {
      toast.warning('Para registrar el nombre ingresa la cédula (10 dígitos)');
      return;
    }
    try {
      await updateUsuario(usuario.id, {
        correo: formData.correo,
        ...(rolProtegido ? {} : { rol: formData.rol }),
        ...(formData.password ? { password: formData.password } : {}),
        ...(formData.nombres ? { nombres: formData.nombres } : {}),
        ...(sinPersona && formData.cedula ? { cedula: formData.cedula } : {}),
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
        style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem', width: '90%', maxWidth: '440px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>✏️ Editar cuenta</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }} aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Nombre</label>
          <input
            type="text"
            value={formData.nombres}
            onChange={(e) => setFormData((p) => ({ ...p, nombres: e.target.value }))}
            style={inputStyle}
            disabled={loading}
          />

          {sinPersona && (
            <>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Cédula <span style={{ fontWeight: 400, color: '#999' }}>(10 dígitos, necesaria para registrar el nombre)</span>
              </label>
              <input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData((p) => ({ ...p, cedula: e.target.value }))}
                style={inputStyle}
                disabled={loading}
                placeholder="1712345678"
              />
            </>
          )}

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Correo</label>
          <input
            type="email"
            value={formData.correo}
            onChange={(e) => setFormData((p) => ({ ...p, correo: e.target.value }))}
            style={inputStyle}
            required
            disabled={loading}
          />

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>Rol</label>
          {rolProtegido ? (
            <div style={{ ...inputStyle, backgroundColor: '#f5f5f5', color: '#888' }}>
              🔒 {usuario.rol} — rol protegido, no se puede cambiar
            </div>
          ) : (
            <select
              value={formData.rol}
              onChange={(e) => setFormData((p) => ({ ...p, rol: e.target.value }))}
              style={inputStyle}
              disabled={loading}
            >
              {ROLES_ASIGNABLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Nueva contraseña <span style={{ fontWeight: 400, color: '#999' }}>(dejar vacío para no cambiarla)</span>
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            style={inputStyle}
            placeholder="••••••••"
            disabled={loading}
          />

          <button type="submit" className="btn" style={{ width: '100%', padding: '0.7rem' }} disabled={loading}>
            {loading ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------- Bitácora de ingresos ----------
function LogsIngreso() {
  const { getAccesos } = useData();
  const [accesos, setAccesos] = useState(null);

  const cargar = useCallback(async () => {
    const data = await getAccesos();
    if (data) setAccesos(data);
  }, [getAccesos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!accesos) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando bitácora de ingresos...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Últimos ingresos al sistema</h3>
        <button className="btn" onClick={cargar} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          🔄 Actualizar
        </button>
      </div>

      {accesos.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Aún no hay ingresos registrados</p>
      ) : (
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Fecha y hora</th>
              <th style={{ padding: '0.6rem' }}>Correo</th>
              <th style={{ padding: '0.6rem' }}>Resultado</th>
              <th style={{ padding: '0.6rem' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>
                  {new Date(a.fecha).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td style={{ padding: '0.6rem' }}>{a.correo}</td>
                <td style={{ padding: '0.6rem' }}>
                  <span style={{ color: a.exito ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                    {a.exito ? '✅ Exitoso' : '❌ Fallido'}
                  </span>
                </td>
                <td style={{ padding: '0.6rem', fontSize: '0.85rem', color: '#888' }}>{a.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
