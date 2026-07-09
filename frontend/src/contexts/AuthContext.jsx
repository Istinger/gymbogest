import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRol = localStorage.getItem('rol');
    if (storedToken) {
      setToken(storedToken);
      setRol(storedRol);
    }
    setLoading(false);
  }, []);

  const login = (newToken, newRol) => {
    setToken(newToken);
    setRol(newRol);
    localStorage.setItem('token', newToken);
    localStorage.setItem('rol', newRol);
  };

  const logout = () => {
    setToken(null);
    setRol(null);
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
  };

  return (
    <AuthContext.Provider value={{ token, rol, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
