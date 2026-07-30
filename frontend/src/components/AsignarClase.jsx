// RF-02/RF-03 — Recepción asigna clases a los niños inscritos (CU-02 en el local)
// Las reglas de negocio las valida el backend (reservaService): cupo lleno,
// saldo del paquete, reserva duplicada y choque de horarios → llegan como 409/toast.
import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { toast } from 'react-toastify';

const PROGRAMAS = {
  PLAY_LEARN: '🎨 Play & Learn',
  MUSIC: '🎵 Music',
  ART: '🖼️ Art',
  SCHOOL_SKILLS: '📚 School Skills',
  PLAYLAB: '🧪 PlayLab',
};

export function AsignarClase() {
  const { familias, getFamilias, clases, getClases, createReserva, loading } = useData();
  const [formData, setFormData] = useState({
    familiaId: '',
    ninoId: '',
    programa: '',
    claseId: '',
    paqueteId: '',
  });

  useEffect(() => {
    getFamilias();
    getClases();
  }, [getFamilias, getClases]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Al cambiar de familia se reinician niño y paquete; de programa, el horario
      ...(name === 'familiaId' ? { ninoId: '', paqueteId: '' } : {}),
      ...(name === 'programa' ? { claseId: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ninoId || !formData.claseId || !formData.paqueteId) {
      toast.warning('Completa todos los campos');
      return;
    }
    try {
      await createReserva({
        ninoId: Number(formData.ninoId),
        claseId: Number(formData.claseId),
        paqueteId: Number(formData.paqueteId),
      });
      setFormData({ familiaId: '', ninoId: '', programa: '', claseId: '', paqueteId: '' });
      getClases(); // refrescar cupos
    } catch (error) {
      // El toast de error (cupo/duplicado/choque de horario) ya lo muestra DataContext
    }
  };

  const familiaSeleccionada = familias.find((f) => f.id === Number(formData.familiaId));
  const ninos = familiaSeleccionada?.ninos || [];
  const paquetes = familiaSeleccionada?.paquetes || [];

  const cupoUsado = (c) => c._count?.reservas ?? 0;

  const programasDisponibles = [...new Set(
    clases.filter((c) => cupoUsado(c) < c.cupoMaximo).map((c) => c.programa)
  )];

  const horariosDisponibles = clases
    .filter((c) => c.programa === formData.programa && cupoUsado(c) < c.cupoMaximo)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  const formatHorario = (fechaHora) => {
    const d = new Date(fechaHora);
    const fecha = d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  };

  const nombreFamilia = (f) => {
    const tutor = f.tutores?.[0]?.persona?.nombres || 'Sin tutor';
    const hijos = f.ninos?.map((n) => n.nombres.split(' ')[0]).join(', ') || 'sin niños';
    return `${tutor} (${hijos})`;
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
  };

  return (
    <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>Asignar clase a un niño</h3>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
        El sistema valida cupo (máx. 9), saldo del paquete, reservas duplicadas y choques de horario.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: '1rem', alignItems: 'flex-end' }}
      >
        <div className="form-group">
          <label>Familia *</label>
          <select name="familiaId" value={formData.familiaId} onChange={handleChange} style={selectStyle} required disabled={loading}>
            <option value="">-- Selecciona --</option>
            {familias.map((f) => (
              <option key={f.id} value={f.id}>
                {nombreFamilia(f)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Niño *</label>
          <select name="ninoId" value={formData.ninoId} onChange={handleChange} style={selectStyle} required disabled={loading || !formData.familiaId}>
            <option value="">{formData.familiaId ? '-- Selecciona --' : 'Primero la familia'}</option>
            {ninos.map((nino) => (
              <option key={nino.id} value={nino.id}>
                {nino.nombres}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Clase *</label>
          <select name="programa" value={formData.programa} onChange={handleChange} style={selectStyle} required disabled={loading}>
            <option value="">-- Selecciona --</option>
            {programasDisponibles.map((prog) => (
              <option key={prog} value={prog}>
                {PROGRAMAS[prog] || prog}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Horario disponible *</label>
          <select name="claseId" value={formData.claseId} onChange={handleChange} style={selectStyle} required disabled={loading || !formData.programa}>
            <option value="">{formData.programa ? '-- Elige un horario --' : 'Primero la clase'}</option>
            {horariosDisponibles.map((clase) => (
              <option key={clase.id} value={clase.id}>
                {formatHorario(clase.fechaHora)} — cupo {cupoUsado(clase)}/{clase.cupoMaximo}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Paquete *</label>
          <select name="paqueteId" value={formData.paqueteId} onChange={handleChange} style={selectStyle} required disabled={loading || !formData.familiaId}>
            <option value="">{formData.familiaId ? '-- Selecciona --' : 'Primero la familia'}</option>
            {paquetes.map((paq) => (
              <option key={paq.id} value={paq.id}>
                {paq.tipo} ({paq.saldoClases} clases)
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn" style={{ width: '100%', padding: '0.75rem', margin: 0 }} disabled={loading}>
          {loading ? '⏳' : '✅ Asignar'}
        </button>
      </form>

      {formData.familiaId && paquetes.length === 0 && (
        <p style={{ marginTop: '0.8rem', color: '#e67e22', fontSize: '0.9rem' }}>
          ⚠️ Esta familia no tiene paquetes contratados: no se le pueden asignar clases.
        </p>
      )}
    </div>
  );
}
