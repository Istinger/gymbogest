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

export function NuevaReserva() {
  const { clases, getClases, createReserva, loading } = useData();
  const [formData, setFormData] = useState({
    ninoId: '',
    programa: '',
    claseId: '',
    paqueteId: '',
  });
  const [niños, setNiños] = useState([]);
  const [paquetes, setPaquetes] = useState([]);

  useEffect(() => {
    getClases();
    cargarMisHijos();
  }, [getClases]);

  const cargarMisHijos = async () => {
    try {
      const ninosData = await fetch('/api/familias/mis-ninos', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }).then((r) => r.json());

      // Hermanos comparten familia: deduplicar paquetes por id
      const paquetesUnicos = new Map();
      for (const nino of ninosData) {
        for (const paq of nino.familia?.paquetes || []) {
          paquetesUnicos.set(paq.id, paq);
        }
      }

      setNiños(ninosData);
      setPaquetes([...paquetesUnicos.values()]);
    } catch (err) {
      toast.error('Error al cargar tus hijos. Intenta más tarde.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Al cambiar de programa se reinicia el horario elegido
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

      setFormData({ ninoId: '', programa: '', claseId: '', paqueteId: '' });
      getClases(); // refrescar cupos
    } catch (error) {
      // El toast de error (409 cupo lleno / duplicado) ya lo muestra DataContext
    }
  };

  const claseSeleccionada = clases.find((c) => c.id === Number(formData.claseId));

  const cupoUsado = (c) => c._count?.reservas ?? 0;

  // Programas que tienen al menos un horario con cupo
  const programasDisponibles = [...new Set(
    clases.filter((c) => cupoUsado(c) < c.cupoMaximo).map((c) => c.programa)
  )];

  // Horarios disponibles del programa elegido (con cupo, ordenados por fecha)
  const horariosDisponibles = clases
    .filter((c) => c.programa === formData.programa && cupoUsado(c) < c.cupoMaximo)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  const formatHorario = (fechaHora) => {
    const d = new Date(fechaHora);
    const fecha = d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    const hora = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} · ${hora}`;
  };

  return (
    <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Crear Nueva Reserva</h3>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
        <div className="form-group">
          <label>Selecciona un hijo *</label>
          <select
            name="ninoId"
            value={formData.ninoId}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '0.95rem',
            }}
            required
            disabled={loading}
          >
            <option value="">-- Selecciona --</option>
            {niños.map((nino) => (
              <option key={nino.id} value={nino.id}>
                {nino.nombres}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Selecciona una clase *</label>
          <select
            name="programa"
            value={formData.programa}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '0.95rem',
            }}
            required
            disabled={loading}
          >
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
          <select
            name="claseId"
            value={formData.claseId}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '0.95rem',
            }}
            required
            disabled={loading || !formData.programa}
          >
            <option value="">
              {formData.programa ? '-- Elige un horario --' : 'Primero elige la clase'}
            </option>
            {horariosDisponibles.map((clase) => (
              <option key={clase.id} value={clase.id}>
                {formatHorario(clase.fechaHora)} — cupo {cupoUsado(clase)}/{clase.cupoMaximo}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Selecciona un paquete *</label>
          <select
            name="paqueteId"
            value={formData.paqueteId}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '0.95rem',
            }}
            required
            disabled={loading}
          >
            <option value="">-- Selecciona --</option>
            {paquetes.map((paq) => (
              <option key={paq.id} value={paq.id}>
                {paq.tipo} ({paq.saldoClases} clases)
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn"
          style={{ width: '100%', padding: '0.75rem', margin: 0 }}
          disabled={loading}
        >
          {loading ? '⏳' : '✅ Reservar'}
        </button>
      </form>

      {claseSeleccionada && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#e8f4f8',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        >
          <p style={{ margin: '0.3rem 0' }}>
            <strong>Clase:</strong> {PROGRAMAS[claseSeleccionada.programa]}
          </p>
          <p style={{ margin: '0.3rem 0' }}>
            <strong>Fecha:</strong> {new Date(claseSeleccionada.fechaHora).toLocaleDateString('es-EC')}
          </p>
          <p style={{ margin: '0.3rem 0' }}>
            <strong>Hora:</strong> {new Date(claseSeleccionada.fechaHora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ margin: '0.3rem 0', color: (claseSeleccionada._count?.reservas ?? 0) >= claseSeleccionada.cupoMaximo ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
            Cupo: {claseSeleccionada._count?.reservas ?? 0}/{claseSeleccionada.cupoMaximo}
          </p>
        </div>
      )}
    </div>
  );
}
