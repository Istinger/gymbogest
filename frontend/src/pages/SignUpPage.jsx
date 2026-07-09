// T22 — Sign up público: crea una cuenta con rol TUTOR por defecto.
// La Propietaria puede elevar el rol después desde su panel (RNF-01).
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { toast } from 'react-toastify';

export function SignUpPage() {
  const { signUp, loading } = useData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombres: '',
    correo: '',
    password: '',
    confirmar: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmar) {
      toast.warning('Las contraseñas no coinciden');
      return;
    }
    try {
      await signUp({
        nombres: formData.nombres,
        correo: formData.correo,
        password: formData.password,
      });
      navigate('/login');
    } catch (error) {
      // Error ya notificado por toast en DataContext
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
          <h2>Crear una cuenta</h2>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>
            La cuenta se crea como <strong>Tutor</strong>. Si tu correo coincide con el
            registrado en recepción, verás a tus hijos al ingresar.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nombres">Nombre completo</label>
              <input
                id="nombres"
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="María Pérez"
              />
            </div>

            <div className="form-group">
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña (mín. 6 caracteres)</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar"
                type="password"
                name="confirmar"
                value={formData.confirmar}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.95rem' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#667eea', fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>

      <footer style={{ backgroundColor: '#333', color: 'white', padding: '1.5rem', textAlign: 'center', borderTop: '1px solid #555' }}>
        <p>&copy; 2026 GymboGest - Gymboree Play & Music Los Chillos</p>
      </footer>
    </div>
  );
}
