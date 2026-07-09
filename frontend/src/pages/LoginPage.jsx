import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '2rem', textAlign: 'center' }}>
        <h1>GymboGest</h1>
        <p>Sistema de gestión para Gymboree Play & Music</p>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-container">
          <h2>Iniciar sesión</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
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

          <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.95rem' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" style={{ color: '#667eea', fontWeight: 600 }}>
              Crear una cuenta
            </Link>
          </p>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>Credenciales de prueba:</strong></p>
            <p>Admin: admin@gymbo.ec / admin123</p>
            <p>Propietaria: propietaria@gymbo.ec / propietaria123</p>
            <p>Recepción: recepcion@gymbo.ec / semilla123</p>
            <p>Educadora: educadora1@gymbo.ec / semilla123</p>
            <p>Tutor: tutor@gymbo.ec / semilla123</p>
          </div>
        </div>
      </main>

      <footer style={{ backgroundColor: '#333', color: 'white', padding: '1.5rem', textAlign: 'center', borderTop: '1px solid #555' }}>
        <p>&copy; 2026 GymboGest - Gymboree Play & Music Los Chillos</p>
      </footer>
    </div>
  );
}
