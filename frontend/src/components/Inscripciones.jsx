import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const CANALES = ['REDES', 'PEDIATRA_ALIADO', 'EMPRESA', 'REFERIDO'];
const PARENTESCOS = ['padre', 'madre', 'abuelo', 'abuela', 'otro'];

export function Inscripciones() {
  const { familias, loading, getFamilias, createFamilia } = useData();
  const [showForm, setShowForm] = useState(false);
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

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Inscripciones de Familias</h3>
        <button className="btn" onClick={() => setShowForm(!showForm)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          {showForm ? 'Cancelar' : '+ Nueva Inscripción'}
        </button>
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
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Niños</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Tutor a cargo</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Cédula</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Contacto</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Canal</th>
              </tr>
            </thead>
            <tbody>
              {familias.map((familia) => {
                const tutor = familia.tutores?.[0];
                return (
                  <tr key={familia.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>
                      {familia.ninos?.length ? (
                        familia.ninos.map((nino) => (
                          <div key={nino.id} style={{ marginBottom: '0.2rem' }}>
                            🧒 {nino.nombres}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
