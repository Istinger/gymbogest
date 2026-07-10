import { useAuth } from '../contexts/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const ROLES = [
  { rol: 'ADMIN', ruta: 'admin', label: 'Administración' },
  { rol: 'PROPIETARIA', ruta: 'propietaria', label: 'Propietaria' },
  { rol: 'RECEPCION', ruta: 'recepcion', label: 'Recepción' },
  { rol: 'EDUCADORA', ruta: 'educadora', label: 'Educadora' },
  { rol: 'TUTOR', ruta: 'tutor', label: 'Tutor' },
];

// Qué paneles ve cada rol en la barra de navegación
const NAV_POR_ROL = {
  ADMIN: ['ADMIN'],
  PROPIETARIA: ['PROPIETARIA', 'RECEPCION', 'EDUCADORA'],
  RECEPCION: ['RECEPCION'],
  EDUCADORA: ['RECEPCION', 'EDUCADORA'],
  TUTOR: ['TUTOR'],
};

export function Layout({ children }) {
  const { rol, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rolActual = ROLES.find((r) => r.rol === rol);

  return (
    <div className="container">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <header className="site-header">
        <div className="header-inner">
          <span className="brand">
            <span className="brand-badge">GymboGest</span>
            <small>Gymboree Play &amp; Music<br />Los Chillos</small>
          </span>
          <div className="header-actions">
            <span className="role-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
              <span className="rol-label">Rol:&nbsp;</span>
              <span>{rolActual?.label || rol}</span>
            </span>
            <ThemeToggle />
            <button className="logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <nav className="role-nav" aria-label="Paneles por rol">
        <div className="role-nav-inner">
          {/* NavLink marca la pestaña activa según la RUTA actual (no el rol del usuario) */}
          {ROLES.filter((r) => (NAV_POR_ROL[rol] || [rol]).includes(r.rol)).map((r) => (
            <NavLink
              key={r.rol}
              to={`/panel/${r.ruta}`}
              className={({ isActive }) => `role-tab${isActive ? ' active' : ''}`}
            >
              {r.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main id="contenido">{children}</main>

      <footer>
        <p>&copy; 2026 GymboGest - Gymboree Play &amp; Music Los Chillos</p>
      </footer>
    </div>
  );
}
