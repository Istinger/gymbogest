import { Layout } from '../components/Layout';
import { NuevaReserva } from '../components/NuevaReserva';
import { MisReservas } from '../components/MisReservas';

export function TutorPanel() {
  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            👨‍👩‍👧 Portal de Tutor
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Reserva, reagenda y cancela clases para tu hijo
          </p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem' }}>
          <NuevaReserva />
          <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />

          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>Mis Reservas</h3>
            <MisReservas />
          </div>
        </div>
      </div>
    </Layout>
  );
}
