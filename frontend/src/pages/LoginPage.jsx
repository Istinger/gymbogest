// RF-01 / CU-01 — Inicio de sesión con redirección por rol (RNF-01).
// Diseño: panel de marca Gymboree (assets de gymboreeclases.com.ec) + formulario.
// Mock de referencia: design/login-mock.html
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import logoGymboree from '../assets/logo-gymboree1.png';
import fotoBabies from '../assets/babies.jpeg';
import fotoMusic from '../assets/music.jpeg';
import fotoArt from '../assets/art.jpeg';
import fotoPlaylab from '../assets/playlab.jpeg';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/login', { correo: email, password });
      login(data.token, data.rol);

      const roleRoutes = {
        ADMIN: '/panel/admin',
        PROPIETARIA: '/panel/propietaria',
        RECEPCION: '/panel/recepcion',
        EDUCADORA: '/panel/educadora',
        TUTOR: '/panel/tutor',
      };

      navigate(roleRoutes[data.rol] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <ThemeToggle className="theme-toggle-float" />
      <section className="login-brand" aria-label="Gymboree Play & Music Los Chillos">
        <img
          className="login-logo"
          src={logoGymboree}
          alt="Gymboree Play & Music"
          width="313"
          height="70"
        />
        <h1>Aprender jugando empieza aquí</h1>
        <p>
          GymboGest — reserva clases, sigue el progreso de tus hijos y gestiona el
          centro en un solo lugar.
        </p>
        <img
          className="login-photo"
          src={fotoBabies}
          alt="Bebé sonriendo en clase Gymboree"
          width="1000"
          height="667"
        />
        <div className="login-thumbs" aria-hidden="true">
          <img src={fotoMusic} alt="" width="88" height="88" />
          <img src={fotoArt} alt="" width="88" height="88" />
          <img src={fotoPlaylab} alt="" width="88" height="88" />
        </div>
      </section>

      <main className="login-form-panel">
        <div className="login-card">
          <h2>Iniciar sesión</h2>
          <p className="login-subtitle">Bienvenido de nuevo. Ingresa tus credenciales.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="signup-hint">
            ¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link>
          </p>

          <details className="test-creds">
            <summary>Credenciales de prueba</summary>
            <div>
              <p>Admin: <code>admin@gymbo.ec / admin123</code></p>
              <p>Propietaria: <code>propietaria@gymbo.ec / propietaria123</code></p>
              <p>Recepción: <code>recepcion@gymbo.ec / semilla123</code></p>
              <p>Educadora: <code>educadora1@gymbo.ec / semilla123</code></p>
              <p>Tutor: <code>tutor@gymbo.ec / semilla123</code></p>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
