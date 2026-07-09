import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const PROGRAMAS = {
  PLAY_LEARN: '🎨 Play & Learn',
  MUSIC: '🎵 Music',
  ART: '🖼️ Art',
  SCHOOL_SKILLS: '📚 School Skills',
  PLAYLAB: '🧪 PlayLab',
};

export function AgendaDelDia() {
  const { agenda, loading, getAgenda } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    getAgenda(selectedDate);
  }, [selectedDate, getAgenda]);

  const formatHora = (fechaHora) => {
    const date = new Date(fechaHora);
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  const getOcupacionColor = (ocupacion, cupoMaximo) => {
    const porcentaje = (ocupacion / cupoMaximo) * 100;
    if (porcentaje >= 100) return '#e74c3c'; // Rojo - lleno
    if (porcentaje >= 80) return '#f39c12'; // Naranja - casi lleno
    return '#27ae60'; // Verde - con espacio
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Agenda del Día</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '1rem',
          }}
        />
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : agenda.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#999' }}>
          <p>No hay clases programadas para este día</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {agenda.map((clase) => {
            // La API de agenda entrega ocupacion como "X / 9" (formato del wireframe)
            const [usado, maximo] = clase.ocupacion.split('/').map((n) => parseInt(n, 10));
            return (
              <div
                key={clase.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #eee',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#667eea', marginBottom: '0.5rem' }}>
                    {PROGRAMAS[clase.programa] || clase.programa}
                  </h4>
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>
                    ⏰ {formatHora(clase.hora)}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: getOcupacionColor(usado, maximo),
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {clase.ocupacion}
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {maximo - usado} espacio(s) disponible(s)
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {clase.cupoLleno ? (
                    <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>❌ Clase Llena</span>
                  ) : usado >= maximo * 0.8 ? (
                    <span style={{ color: '#f39c12', fontWeight: 'bold' }}>⚠️ Casi Llena</span>
                  ) : (
                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ Con Cupo</span>
                  )}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>
                    Educadora: <strong>{clase.educadora || 'No asignada'}</strong>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
