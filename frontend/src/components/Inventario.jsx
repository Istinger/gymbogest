// RF-06 / HF-6 — Inventario de material didáctico (panel Recepción)
// Criterio de aceptación: si stock < stockMinimo → alerta de reposición.
// Educadora solo consulta; Recepción y Propietaria registran materiales y movimientos.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { toast } from 'react-toastify';

export function Inventario() {
  const { rol } = useAuth();
  const { getMateriales, createMaterial, registrarMovimiento, loading } = useData();
  const [materiales, setMateriales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', stock: '', stockMinimo: '' });
  const [cantidades, setCantidades] = useState({}); // cantidad por material para el movimiento

  const puedeEditar = rol === 'RECEPCION' || rol === 'PROPIETARIA';

  const cargar = useCallback(async () => {
    const data = await getMateriales();
    if (data) setMateriales(data);
  }, [getMateriales]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      await createMaterial({
        nombre: formData.nombre,
        stock: Number(formData.stock) || 0,
        stockMinimo: Number(formData.stockMinimo) || 0,
      });
      setFormData({ nombre: '', stock: '', stockMinimo: '' });
      setShowForm(false);
      await cargar();
    } catch (error) { /* toast en DataContext */ }
  };

  const handleMovimiento = async (materialId, signo) => {
    const cantidad = Number(cantidades[materialId]) || 1;
    if (cantidad <= 0) {
      toast.warning('La cantidad debe ser mayor a 0');
      return;
    }
    try {
      await registrarMovimiento(materialId, signo * cantidad);
      setCantidades((p) => ({ ...p, [materialId]: '' }));
      await cargar();
    } catch (error) { /* toast en DataContext */ }
  };

  const enAlerta = materiales.filter((m) => m.enAlerta);
  const inputStyle = { width: '100%', padding: '0.7rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.95rem' };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h3>📦 Inventario de material didáctico</h3>
        {puedeEditar && (
          <button className="btn" onClick={() => setShowForm(!showForm)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
            {showForm ? 'Cancelar' : '+ Nuevo material'}
          </button>
        )}
      </div>

      {/* HF-6: alerta de reposición cuando stock < stock mínimo */}
      {enAlerta.length > 0 && (
        <div
          style={{
            backgroundColor: '#fdecea',
            border: '1px solid #e74c3c',
            color: '#c0392b',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>⚠️ Reposición necesaria:</strong>{' '}
          {enAlerta.map((m) => `${m.nombre} (${m.stock}/${m.stockMinimo} mín.)`).join(' · ')}
        </div>
      )}

      {showForm && puedeEditar && (
        <form
          onSubmit={handleCrear}
          style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '1rem', alignItems: 'flex-end' }}
        >
          <div className="form-group">
            <label>Nombre del material *</label>
            <input type="text" value={formData.nombre} onChange={(e) => setFormData((p) => ({ ...p, nombre: e.target.value }))} style={inputStyle} required placeholder="Pelotas sensoriales" />
          </div>
          <div className="form-group">
            <label>Stock inicial</label>
            <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))} style={inputStyle} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Stock mínimo</label>
            <input type="number" min="0" value={formData.stockMinimo} onChange={(e) => setFormData((p) => ({ ...p, stockMinimo: e.target.value }))} style={inputStyle} placeholder="0" />
          </div>
          <button type="submit" className="btn" style={{ padding: '0.7rem 1rem', margin: 0 }} disabled={loading}>
            Registrar
          </button>
        </form>
      )}

      {materiales.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#999' }}>
          <p>No hay materiales registrados en el inventario</p>
        </div>
      ) : (
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Material</th>
              <th style={{ padding: '0.75rem' }}>Stock</th>
              <th style={{ padding: '0.75rem' }}>Mínimo</th>
              <th style={{ padding: '0.75rem' }}>Estado</th>
              {puedeEditar && <th style={{ padding: '0.75rem' }}>Movimiento (entrada / salida)</th>}
            </tr>
          </thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5', backgroundColor: m.enAlerta ? '#fff5f5' : 'transparent' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.nombre}</td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: m.enAlerta ? '#e74c3c' : '#27ae60' }}>{m.stock}</td>
                <td style={{ padding: '0.75rem', color: '#888' }}>{m.stockMinimo}</td>
                <td style={{ padding: '0.75rem' }}>
                  {m.enAlerta ? (
                    <span style={{ color: '#e74c3c', fontWeight: 700 }}>🔴 Reponer</span>
                  ) : (
                    <span style={{ color: '#27ae60', fontWeight: 700 }}>🟢 OK</span>
                  )}
                </td>
                {puedeEditar && (
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={cantidades[m.id] || ''}
                        onChange={(e) => setCantidades((p) => ({ ...p, [m.id]: e.target.value }))}
                        placeholder="1"
                        style={{ width: '64px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center' }}
                        disabled={loading}
                      />
                      <button
                        onClick={() => handleMovimiento(m.id, +1)}
                        title="Entrada (suma al stock)"
                        style={{ padding: '0.4rem 0.7rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                        disabled={loading}
                      >
                        ➕
                      </button>
                      <button
                        onClick={() => handleMovimiento(m.id, -1)}
                        title="Salida (resta del stock)"
                        style={{ padding: '0.4rem 0.7rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                        disabled={loading}
                      >
                        ➖
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
