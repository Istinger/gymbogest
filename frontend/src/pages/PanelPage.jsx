import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';

const roleDescriptions = {
  propietaria: {
    title: 'Panel de Propietaria',
    description: 'Acceso a indicadores, reportes y servicios corporativos',
    icon: '📊',
  },
  recepcion: {
    title: 'Panel de Recepción',
    description: 'Gestión de inscripciones, agenda y reservas',
    icon: '📋',
  },
  educadora: {
    title: 'Panel de Educadora',
    description: 'Registro de asistencia, progreso y lista de clases',
    icon: '👩‍🏫',
  },
  tutor: {
    title: 'Portal de Tutor',
    description: 'Reservar, reagendar y cancelar clases; ver progreso',
    icon: '👨‍👩‍👧',
  },
};

export function PanelPage() {
  const { rol: currentRol } = useAuth();
  const { rol } = useParams();

  const roleInfo = roleDescriptions[rol];

  if (!roleInfo) {
    return (
      <Layout>
        <div className="error-message">Rol no encontrado</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {roleInfo.icon} {roleInfo.title}
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>{roleInfo.description}</p>
        </div>

        <div style={{ padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            Contenido del panel en desarrollo (T19-T22)...
          </p>
          <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.9rem' }}>
            Tu rol actual: <strong>{currentRol}</strong>
          </p>
        </div>
      </div>
    </Layout>
  );
}
