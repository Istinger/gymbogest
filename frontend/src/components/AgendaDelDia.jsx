import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const PROGRAMAS = {
  PLAY_LEARN: '🎨 Play & Learn',
  MUSIC: '🎵 Music',
  ART: '🖼️ Art',
  SCHOOL_SKILLS: '📚 School Skills',
  PLAYLAB: '🧪 PlayLab',
};

// Color estable por educadora (mismo lenguaje que el calendario mensual de Propietaria)
const COLORES_EDUCADORA = ['#F7941E', '#046BD2', '#27AE60', '#8E44AD', '#E74C3C', '#16A085'];

export function AgendaDelDia() {
  const { agenda, loading, getAgenda } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    getAgenda(selectedDate);
  }, [selectedDate, getAgenda]);

  const formatHora = (fechaHora) =>
    new Date(fechaHora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  // Leyenda: color por educadora, según orden de aparición
  const nombresEducadoras = [...new Set(agenda.map((c) => c.educadora || 'Sin asignar'))];
  const colorDe = (nombre) => COLORES_EDUCADORA[nombresEducadoras.indexOf(nombre) % COLORES_EDUCADORA.length];

  // Agrupar clases por HORA del día. Varias clases en la misma franja se
  // apilan lado a lado (flex-wrap): nunca se solapan visualmente.
  const porHora = {};
  for (const clase of agenda) {
    const h = new Date(clase.hora).getHours();
    (porHora[h] ??= []).push(clase);
  }
  Object.values(porHora).forEach((lista) => lista.sort((a, b) => new Date(a.hora) - new Date(b.hora)));

  // Rango horario visible: 9:00–17:00 como base, extendido si hay clases fuera
  const horasConClase = Object.keys(porHora).map(Number);
  const horaInicio = Math.min(9, ...(horasConClase.length ? horasConClase : [9]));
  const horaFin = Math.max(17, ...(horasConClase.length ? horasConClase : [17]));
  const horas = Array.from({ length: horaFin - horaInicio + 1 }, (_, i) => horaInicio + i);

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>🗓️ Agenda del Día</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-fg)',
            fontSize: '1rem',
          }}
        />
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : agenda.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-muted)' }}>
          <p>No hay clases programadas para este día</p>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {/* Leyenda: color por educadora */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem 1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
            {nombresEducadoras.map((nombre) => (
              <span key={nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: colorDe(nombre) }} />
                {nombre}
              </span>
            ))}
          </div>

          {/* Grilla horaria del día */}
          {horas.map((h) => {
            const clasesHora = porHora[h] || [];
            return (
              <div
                key={h}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr',
                  borderBottom: h === horaFin ? 'none' : '1px solid var(--color-border)',
                  minHeight: '52px',
                  backgroundColor: clasesHora.length ? 'var(--color-surface)' : 'var(--color-bg)',
                }}
              >
                <div style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid var(--color-border)' }}>
                  {String(h).padStart(2, '0')}:00
                </div>

                {/* Clases de la franja: lado a lado, con salto de línea si no caben */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.4rem', alignItems: 'flex-start' }}>
                  {clasesHora.map((clase) => (
                    <div
                      key={clase.id}
                      title={`${PROGRAMAS[clase.programa] || clase.programa} — ${formatHora(clase.hora)} — ${clase.educadora || 'Sin asignar'} — Cupo ${clase.ocupacion}`}
                      style={{
                        backgroundColor: colorDe(clase.educadora || 'Sin asignar'),
                        color: 'white',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        maxWidth: '240px',
                        outline: clase.cupoLleno ? '2px solid var(--color-danger)' : 'none',
                        outlineOffset: '1px',
                      }}
                    >
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatHora(clase.hora)} · {PROGRAMAS[clase.programa] || clase.programa}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.92, display: 'flex', gap: '0.5rem' }}>
                        <span>{(clase.educadora || 'Sin asignar').split(' ')[0]}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {clase.cupoLleno ? `⛔ ${clase.ocupacion} · LLENA` : `👥 ${clase.ocupacion}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
