import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Layout({ children }) {
  const { rol, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePanelChange = (newRol) => {
    navigate(`/panel/${newRol}`);
  };

  const roleDisplayNames = {
    PROPIETARIA: 'Propietaria',
    RECEPCION: 'Recepción',
    EDUCADORA: 'Educadora',
    TUTOR: 'Tutor',
  };

  return (
    <div className="container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>GymboGest</h1>
          <div>
            <span style={{ marginRight: '1rem' }}>
              Rol: <strong>{roleDisplayNames[rol] || rol}</strong>
            </span>
            <button className="btn logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <nav style={{ backgroundColor: '#f0f0f0', padding: '1rem 2rem' }}>
        <div className="nav-container">
          <button
            onClick={() => handlePanelChange('propietaria')}
            className={rol === 'PROPIETARIA' ? 'active' : ''}
          >
            Propietaria
          </button>
          <button
            onClick={() => handlePanelChange('recepcion')}
            className={rol === 'RECEPCION' ? 'active' : ''}
          >
            Recepción
          </button>
          <button
            onClick={() => handlePanelChange('educadora')}
            className={rol === 'EDUCADORA' ? 'active' : ''}
          >
            Educadora
          </button>
          <button
            onClick={() => handlePanelChange('tutor')}
            className={rol === 'TUTOR' ? 'active' : ''}
          >
            Tutor
          </button>
        </div>
      </nav>

      <main>{children}</main>

      <footer>
        <p>&copy; 2026 GymboGest - Gymboree Play & Music Los Chillos</p>
      </footer>
    </div>
  );
}
