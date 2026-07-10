import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// roles (opcional): lista blanca de roles que pueden ver la ruta.
// Si el rol autenticado no está en la lista, se lo redirige a SU panel ("/").
export function PrivateRoute({ children, roles }) {
  const { token, rol, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
