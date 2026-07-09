import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { PanelPage } from './pages/PanelPage';
import { PrivateRoute } from './components/PrivateRoute';

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
      <Route
        path="/panel/:rol"
        element={
          <PrivateRoute>
            <PanelPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={token ? <Navigate to="/panel/propietaria" /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
