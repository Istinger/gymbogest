import { Layout } from '../components/Layout';
import { Inscripciones } from '../components/Inscripciones';
import { AsignarClase } from '../components/AsignarClase';
import { AgendaDelDia } from '../components/AgendaDelDia';

export function RecepcionPanel() {
  return (
    <Layout>
      <div className="panel">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            📋 Panel de Recepción
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Gestión de inscripciones y visualización de la agenda diaria
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '1.5rem' }}>
          <Inscripciones />
          <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />
          <AsignarClase />
          <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />
          <AgendaDelDia />
        </div>
      </div>
    </Layout>
  );
}
