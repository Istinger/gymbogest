import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function ThemeToggle() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('gg-theme', next);
    setTheme(next);
  };

  return (
    <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label="Cambiar tema claro/oscuro">
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}

const ROLES = [
  { rol: 'PROPIETARIA', ruta: 'propietaria', label: 'Propietaria' },
  { rol: 'RECEPCION', ruta: 'recepcion', label: 'Recepción' },
  // Educadora: también accesible para Recepción y Propietaria, nunca para Tutor
  { rol: 'EDUCADORA', ruta: 'educadora', label: 'Educadora', ocultoPara: ['TUTOR'] },
  { rol: 'TUTOR', ruta: 'tutor', label: 'Tutor' },
];

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
          {ROLES.filter((r) => !r.ocultoPara?.includes(rol)).map((r) => (
            <button
              key={r.rol}
              className={`role-tab${rol === r.rol ? ' active' : ''}`}
              aria-current={rol === r.rol ? 'page' : undefined}
              onClick={() => navigate(`/panel/${r.ruta}`)}
            >
              {r.label}
            </button>
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
