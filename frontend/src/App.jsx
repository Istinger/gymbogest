import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { RecepcionPanel } from './pages/RecepcionPanel';
import { TutorPanel } from './pages/TutorPanel';
import { EducadoraPanel } from './pages/EducadoraPanel';
import { PropietariaPanel } from './pages/PropietariaPanel';
import { AdminPanel } from './pages/AdminPanel';
import { PrivateRoute } from './components/PrivateRoute';

const RUTA_POR_ROL = {
  ADMIN: '/panel/admin',
  PROPIETARIA: '/panel/propietaria',
  RECEPCION: '/panel/recepcion',
  EDUCADORA: '/panel/educadora',
  TUTOR: '/panel/tutor',
};

function AppRoutes() {
  const { token, rol } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/registro" element={token ? <Navigate to="/" /> : <SignUpPage />} />
      <Route path="/panel/recepcion" element={<PrivateRoute roles={['RECEPCION', 'PROPIETARIA', 'EDUCADORA']}><RecepcionPanel /></PrivateRoute>} />
      <Route path="/panel/tutor" element={<PrivateRoute roles={['TUTOR']}><TutorPanel /></PrivateRoute>} />
      {/* Panel Educadora: visible para Educadora, Recepción y Propietaria — nunca Tutor */}
      <Route path="/panel/educadora" element={<PrivateRoute roles={['EDUCADORA', 'RECEPCION', 'PROPIETARIA']}><EducadoraPanel /></PrivateRoute>} />
      <Route path="/panel/propietaria" element={<PrivateRoute roles={['PROPIETARIA']}><PropietariaPanel /></PrivateRoute>} />
      <Route path="/panel/admin" element={<PrivateRoute roles={['ADMIN']}><AdminPanel /></PrivateRoute>} />
      <Route path="/" element={token ? <Navigate to={RUTA_POR_ROL[rol] || '/login'} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
          <ToastContainer position="bottom-right" autoClose={3000} />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
