import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LoginPage } from './pages/LoginPage';
import { PanelPage } from './pages/PanelPage';
import { RecepcionPanel } from './pages/RecepcionPanel';
import { TutorPanel } from './pages/TutorPanel';
import { EducadoraPanel } from './pages/EducadoraPanel';
import { PrivateRoute } from './components/PrivateRoute';

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/panel/recepcion" element={<PrivateRoute><RecepcionPanel /></PrivateRoute>} />
      <Route path="/panel/tutor" element={<PrivateRoute><TutorPanel /></PrivateRoute>} />
      <Route path="/panel/educadora" element={<PrivateRoute><EducadoraPanel /></PrivateRoute>} />
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
        <DataProvider>
          <AppRoutes />
          <ToastContainer position="bottom-right" autoClose={3000} />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
