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

export function MisReservas() {
  const { reservas, loading, getMisReservas, updateReserva } = useData();
  const [reservaAReagendar, setReservaAReagendar] = useState(null);
  const [accionEnProceso, setAccionEnProceso] = useState(null);

  useEffect(() => {
    getMisReservas();
  }, [getMisReservas]);

  const formatFecha = (fechaHora) => {
    const date = new Date(fechaHora);
    return date.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatHora = (fechaHora) => {
    const date = new Date(fechaHora);
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  const getEstadoColor = (estado) => {
    const colores = {
      ACTIVA: '#27ae60',
      CANCELADA: '#e74c3c',
      COMPLETADA: '#3498db',
      REAGENDADA: '#95a5a6',
    };
    return colores[estado] || '#95a5a6';
  };

  const cancelarReserva = async (reservaId) => {
    setAccionEnProceso(reservaId);
    try {
      await updateReserva(reservaId, 'cancelar');
      await getMisReservas();
    } finally {
      setAccionEnProceso(null);
    }
  };

  // Confirmación con toast (react-toastify) en lugar de window.confirm
  const handleCancelar = (reserva) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p style={{ margin: '0 0 0.8rem', fontWeight: 600 }}>
            ¿Cancelar la reserva de {reserva.nino?.nombres} en{' '}
            {PROGRAMAS[reserva.clase?.programa] || reserva.clase?.programa}?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                closeToast();
                cancelarReserva(reserva.id);
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sí, cancelar
            </button>
            <button
              onClick={closeToast}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: '#ecf0f1',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              No, mantener
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false, draggable: false, position: 'top-center' }
    );
  };

  const handleReagendar = async (reservaId, nuevaClaseId) => {
    setAccionEnProceso(reservaId);
    try {
      await updateReserva(reservaId, 'reagendar', { nuevaClaseId });
      setReservaAReagendar(null);
      await getMisReservas();
    } catch (error) {
      // Error ya notificado por toast en DataContext
    } finally {
      setAccionEnProceso(null);
    }
  };

  if (loading && reservas.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando tus reservas...</p>
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#999' }}>
        <p>No tienes reservas aún</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Crea una nueva reserva arriba para empezar</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {reservas.map((reserva) => (
          <div
            key={reserva.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #eee',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.3s',
            }}
          >
            <div
              style={{
                backgroundColor: getEstadoColor(reserva.estado),
                color: 'white',
                padding: '1rem',
              }}
            >
              <h4 style={{ marginBottom: '0.5rem' }}>
                {PROGRAMAS[reserva.clase?.programa] || reserva.clase?.programa}
              </h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {formatFecha(reserva.clase?.fechaHora)}
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                  <strong>Hora:</strong> {formatHora(reserva.clase?.fechaHora)}
                </p>
                <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                  <strong>Niño:</strong> {reserva.nino?.nombres}
                </p>
                <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                  <strong>Estado:</strong> {reserva.estado}
                </p>
                <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                  <strong>Educadora:</strong> {reserva.clase?.empleado?.persona?.nombres || 'No asignada'}
                </p>
              </div>

              {reserva.estado === 'ACTIVA' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setReservaAReagendar(reserva)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                    disabled={accionEnProceso === reserva.id}
                  >
                    📅 Reagendar
                  </button>
                  <button
                    onClick={() => handleCancelar(reserva)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                    disabled={accionEnProceso === reserva.id}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {reservaAReagendar && (
        <ReagendarModal
          reserva={reservaAReagendar}
          onReagendar={handleReagendar}
          onClose={() => setReservaAReagendar(null)}
          isLoading={accionEnProceso === reservaAReagendar.id}
        />
      )}
    </>
  );
}

// Ventana emergente (modal) para elegir la nueva clase — CU-02 reagendar
function ReagendarModal({ reserva, onReagendar, onClose, isLoading }) {
  const { clases, getClases } = useData();
  const [selectedClase, setSelectedClase] = useState('');

  useEffect(() => {
    getClases();
  }, [getClases]);

  const handleSubmit = () => {
    if (!selectedClase) {
      toast.warning('Selecciona una clase para reagendar');
      return;
    }
    onReagendar(reserva.id, Number(selectedClase));
  };

  // El backend expone el cupo ocupado como _count.reservas (activas)
  const cupoUsado = (c) => c._count?.reservas ?? 0;

  // Clases disponibles: excluir la clase actual y las que ya están llenas
  const clasesDisponibles = clases.filter(
    (c) => c.id !== reserva.claseId && cupoUsado(c) < c.cupoMaximo
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📅 Reagendar reserva</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#999' }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          <strong>{reserva.nino?.nombres}</strong> — actualmente en{' '}
          {PROGRAMAS[reserva.clase?.programa] || reserva.clase?.programa} del{' '}
          {new Date(reserva.clase?.fechaHora).toLocaleDateString('es-EC')}
        </p>

        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Selecciona la nueva clase:
        </label>
        <select
          value={selectedClase}
          onChange={(e) => setSelectedClase(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
          disabled={isLoading}
        >
          <option value="">-- Selecciona una clase --</option>
          {clasesDisponibles.map((clase) => (
            <option key={clase.id} value={clase.id}>
              {PROGRAMAS[clase.programa] || clase.programa} — {new Date(clase.fechaHora).toLocaleString('es-EC')} ({cupoUsado(clase)}/{clase.cupoMaximo})
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '0.7rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              opacity: isLoading ? 0.6 : 1,
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Reagendando...' : 'Confirmar reagenda'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.7rem',
              backgroundColor: '#ecf0f1',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
            }}
            disabled={isLoading}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
