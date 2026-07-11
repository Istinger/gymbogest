import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { token } = useAuth();
  const [familias, setFamilias] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: '/api',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

  // Usar ref para evitar múltiples llamadas simultáneas
  const loadingRef = useRef(new Set());

  const handleRequest = useCallback(async (key, requestFn, successMsg = null, showErrorToast = true) => {
    // Si ya está cargando, no hacer otra llamada
    if (loadingRef.current.has(key)) return null;

    loadingRef.current.add(key);
    setLoading(true);

    try {
      const response = await requestFn();
      if (successMsg) toast.success(successMsg);
      return response;
    } catch (error) {
      if (showErrorToast) {
        const mensaje = error.response?.data?.error || error.message || `Error en ${key}`;
        toast.error(mensaje);
      }
      throw error;
    } finally {
      loadingRef.current.delete(key);
      setLoading(false);
    }
  }, []);

  const getFamilias = useCallback(async () => {
    const response = await handleRequest('getFamilias', async () => {
      const { data } = await axiosInstance.get('/familias');
      setFamilias(data);
      return data;
    }, null, true);
    return response;
  }, [axiosInstance, handleRequest]);

  const createFamilia = useCallback(async (familiaData) => {
    const response = await handleRequest('createFamilia', async () => {
      // La respuesta del POST NO es una familia completa ({asociado, familiaId,
      // codigo, nino}): no se inyecta al estado — el caller refresca con getFamilias().
      const { data } = await axiosInstance.post('/familias', familiaData);
      return data;
    }, null, true);
    if (response) {
      // CU-01 exc. 6: si la cédula ya existía, el niño se asoció a la familia
      // EXISTENTE (no hay familia nueva) — avisar con el mensaje real del backend.
      toast.success(response.asociado
        ? response.mensaje
        : `Familia registrada correctamente${response.pruebaGratis
          ? ` — incluye ${response.pruebaGratis.dias} clase(s) de prueba gratis`
          : ''}`);
    }
    return response;
  }, [axiosInstance, handleRequest]);

  // Catálogo de paquetes + prueba gratis (sección Paquetes de Propietaria)
  const getPaquetesCatalogo = useCallback(async () => {
    return handleRequest('getPaquetesCatalogo', async () => {
      const { data } = await axiosInstance.get('/paquetes-catalogo');
      return data;
    }, null, true);
  }, [axiosInstance, handleRequest]);

  const createPaqueteCatalogo = useCallback(async (datos) => {
    return handleRequest('createPaqueteCatalogo', async () => {
      const { data } = await axiosInstance.post('/paquetes-catalogo', datos);
      return data;
    }, 'Paquete agregado al catálogo', true);
  }, [axiosInstance, handleRequest]);

  const updatePaqueteCatalogo = useCallback(async (id, datos) => {
    return handleRequest('updatePaqueteCatalogo', async () => {
      const { data } = await axiosInstance.put(`/paquetes-catalogo/${id}`, datos);
      return data;
    }, 'Paquete actualizado', true);
  }, [axiosInstance, handleRequest]);

  const deletePaqueteCatalogo = useCallback(async (id) => {
    return handleRequest('deletePaqueteCatalogo', async () => {
      const { data } = await axiosInstance.delete(`/paquetes-catalogo/${id}`);
      return data;
    }, 'Paquete eliminado del catálogo', true);
  }, [axiosInstance, handleRequest]);

  const getConfigPrueba = useCallback(async () => {
    return handleRequest('getConfigPrueba', async () => {
      const { data } = await axiosInstance.get('/paquetes-catalogo/prueba');
      return data;
    }, null, true);
  }, [axiosInstance, handleRequest]);

  const updateConfigPrueba = useCallback(async (datos) => {
    return handleRequest('updateConfigPrueba', async () => {
      const { data } = await axiosInstance.put('/paquetes-catalogo/prueba', datos);
      return data;
    }, 'Configuración de la prueba gratis guardada', true);
  }, [axiosInstance, handleRequest]);

  // Extensión CU-01: corregir typos de la inscripción (tutor / niño)
  const updateTutor = useCallback(async (tutorId, datos) => {
    return handleRequest('updateTutor', async () => {
      const { data } = await axiosInstance.put(`/familias/tutor/${tutorId}`, datos);
      return data;
    }, 'Datos del tutor actualizados', true);
  }, [axiosInstance, handleRequest]);

  const updateNino = useCallback(async (ninoId, datos) => {
    const response = await handleRequest('updateNino', async () => {
      const { data } = await axiosInstance.put(`/familias/nino/${ninoId}`, datos);
      return data;
    }, null, true);
    if (response) {
      // La baja cancela las reservas de clases futuras (devuelve el saldo);
      // las clases pasadas se conservan como historial
      toast.success(response.reservasCanceladas > 0
        ? `Niño dado de baja: se cancelaron ${response.reservasCanceladas} reserva(s) de clases futuras y se devolvió el saldo`
        : 'Datos del niño actualizados');
    }
    return response;
  }, [axiosInstance, handleRequest]);

  // Extensión RF-03: contratar un paquete del catálogo para una familia
  // (Recepción/Propietaria). El pago es opcional (conPago).
  const contratarPaquete = useCallback(async (familiaId, datos) => {
    const response = await handleRequest('contratarPaquete', async () => {
      const { data } = await axiosInstance.post(`/familias/${familiaId}/paquetes`, datos);
      return data;
    }, null, true);
    if (response) {
      toast.success(response.pago
        ? `Paquete "${response.plantilla?.nombre}" contratado — pago de $${response.pago.monto} registrado (${response.pago.numeroComprobante})`
        : `Paquete "${response.plantilla?.nombre}" contratado (pago por fuera)`);
    }
    return response;
  }, [axiosInstance, handleRequest]);

  // Ajuste manual del paquete contratado — SOLO PROPIETARIA (el backend da 403 al resto)
  const ajustarPaquete = useCallback(async (paqueteId, datos) => {
    return handleRequest('ajustarPaquete', async () => {
      const { data } = await axiosInstance.put(`/familias/paquete/${paqueteId}`, datos);
      return data;
    }, 'Paquete ajustado', true);
  }, [axiosInstance, handleRequest]);

  const getAgenda = useCallback(async (fecha) => {
    const response = await handleRequest('getAgenda', async () => {
      // La API devuelve directamente el array de clases del día
      const { data } = await axiosInstance.get('/agenda', {
        params: { fecha },
      });
      setAgenda(Array.isArray(data) ? data : []);
      return data;
    }, null, false); // No mostrar error silenciosamente en carga
    return response || [];
  }, [axiosInstance, handleRequest]);

  const createReserva = useCallback(async (reservaData) => {
    return handleRequest('createReserva', async () => {
      const { data } = await axiosInstance.post('/reservas', reservaData);
      // Refrescar la lista compartida para que MisReservas se actualice al instante
      const { data: actualizadas } = await axiosInstance.get('/reservas');
      setReservas(actualizadas);
      return data;
    }, 'Reserva creada exitosamente', true);
  }, [axiosInstance, handleRequest]);

  const updateReserva = useCallback(async (reservaId, action, data) => {
    return handleRequest(`updateReserva_${reservaId}`, async () => {
      const { data: response } = await axiosInstance.put(`/reservas/${reservaId}/${action}`, data || {});
      return response;
    }, `Reserva ${action === 'reagendar' ? 'reagendada' : 'cancelada'} exitosamente`, true);
  }, [axiosInstance, handleRequest]);

  // Lista de clase (niños con reserva activa) — panel Educadora
  const getClase = useCallback(async (claseId) => {
    return handleRequest(`getClase_${claseId}`, async () => {
      const { data } = await axiosInstance.get(`/clases/${claseId}`);
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const getAsistencias = useCallback(async (claseId) => {
    return handleRequest('getAsistencias', async () => {
      const { data } = await axiosInstance.get(`/asistencias/clase/${claseId}`);
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const createAsistencia = useCallback(async (asistenciaData) => {
    return handleRequest('createAsistencia', async () => {
      const { data } = await axiosInstance.post('/asistencias', asistenciaData);
      return data;
    }, 'Asistencia registrada correctamente', true);
  }, [axiosInstance, handleRequest]);

  const getProgresos = useCallback(async (ninoId) => {
    return handleRequest('getProgresos', async () => {
      const { data } = await axiosInstance.get(`/progresos/nino/${ninoId}`);
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const createProgreso = useCallback(async (progresoData) => {
    return handleRequest('createProgreso', async () => {
      const { data } = await axiosInstance.post('/progresos', progresoData);
      return data;
    }, 'Progreso registrado correctamente', true);
  }, [axiosInstance, handleRequest]);

  const getIndicadores = useCallback(async (filtros = {}) => {
    return handleRequest('getIndicadores', async () => {
      const { data } = await axiosInstance.get('/indicadores', {
        params: filtros,
      });
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  // Seguimiento de faltas para el Excel (Propietaria)
  const getFaltas = useCallback(async (filtros = {}) => {
    return handleRequest('getFaltas', async () => {
      const { data } = await axiosInstance.get('/indicadores/faltas', {
        params: filtros,
      });
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const getCorporativos = useCallback(async () => {
    return handleRequest('getCorporativos', async () => {
      const { data } = await axiosInstance.get('/corporativos');
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const createCorporativo = useCallback(async (corporativoData) => {
    return handleRequest('createCorporativo', async () => {
      const { data } = await axiosInstance.post('/corporativos', corporativoData);
      return data;
    }, 'Servicio corporativo registrado correctamente', true);
  }, [axiosInstance, handleRequest]);

  // action: 'asignar' ({ educadoraId }) o 'estado' ({ estado })
  const updateCorporativo = useCallback(async (id, action, payload) => {
    return handleRequest(`updateCorporativo_${id}`, async () => {
      const { data } = await axiosInstance.put(`/corporativos/${id}/${action}`, payload);
      return data;
    }, 'Solicitud corporativa actualizada', true);
  }, [axiosInstance, handleRequest]);

  // Sign up público (sin token): crea cuenta con rol TUTOR por defecto
  const signUp = useCallback(async (datos) => {
    return handleRequest('signUp', async () => {
      const { data } = await axios.post('/api/auth/registro', datos);
      return data;
    }, 'Cuenta creada. Ya puedes iniciar sesión', true);
  }, [handleRequest]);

  // Bitácora de ingresos al sistema (solo ADMIN)
  const getAccesos = useCallback(async () => {
    return handleRequest('getAccesos', async () => {
      const { data } = await axiosInstance.get('/usuarios/accesos');
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  // Administración de cuentas (solo ADMIN)
  const getUsuarios = useCallback(async () => {
    return handleRequest('getUsuarios', async () => {
      const { data } = await axiosInstance.get('/usuarios');
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const createUsuario = useCallback(async (datos) => {
    return handleRequest('createUsuario', async () => {
      const { data } = await axiosInstance.post('/usuarios', datos);
      return data;
    }, 'Usuario creado correctamente', true);
  }, [axiosInstance, handleRequest]);

  const updateUsuario = useCallback(async (id, datos) => {
    return handleRequest(`updateUsuario_${id}`, async () => {
      const { data } = await axiosInstance.put(`/usuarios/${id}`, datos);
      return data;
    }, 'Usuario actualizado correctamente', true);
  }, [axiosInstance, handleRequest]);

  const getClases = useCallback(async (filtros = {}) => {
    return handleRequest('getClases', async () => {
      const { data } = await axiosInstance.get('/clases', {
        params: filtros,
      });
      setClases(data);
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  // Programación de clases (Propietaria): crear/actualizar + educadoras
  const createClase = useCallback(async (claseData) => {
    return handleRequest('createClase', async () => {
      const { data } = await axiosInstance.post('/clases', claseData);
      return data;
    }, 'Clase programada correctamente', true);
  }, [axiosInstance, handleRequest]);

  const updateClase = useCallback(async (id, claseData) => {
    return handleRequest(`updateClase_${id}`, async () => {
      const { data } = await axiosInstance.put(`/clases/${id}`, claseData);
      return data;
    }, 'Clase actualizada correctamente', true);
  }, [axiosInstance, handleRequest]);

  const getEmpleados = useCallback(async (rol) => {
    return handleRequest('getEmpleados', async () => {
      const { data } = await axiosInstance.get('/empleados', {
        params: rol ? { rol } : {},
      });
      return data;
    }, null, false);
  }, [axiosInstance, handleRequest]);

  const getMisReservas = useCallback(async () => {
    return handleRequest('getMisReservas', async () => {
      const { data } = await axiosInstance.get('/reservas');
      setReservas(data);
      return data;
    }, null, true);
  }, [axiosInstance, handleRequest]);

  const value = {
    familias,
    agenda,
    reservas,
    clases,
    loading,
    getFamilias,
    createFamilia,
    updateTutor,
    updateNino,
    contratarPaquete,
    ajustarPaquete,
    getPaquetesCatalogo,
    createPaqueteCatalogo,
    updatePaqueteCatalogo,
    deletePaqueteCatalogo,
    getConfigPrueba,
    updateConfigPrueba,
    getAgenda,
    createReserva,
    updateReserva,
    getMisReservas,
    getClases,
    getClase,
    createClase,
    updateClase,
    getEmpleados,
    getAsistencias,
    createAsistencia,
    getProgresos,
    createProgreso,
    getIndicadores,
    getFaltas,
    getCorporativos,
    createCorporativo,
    updateCorporativo,
    signUp,
    getUsuarios,
    createUsuario,
    updateUsuario,
    getAccesos,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de DataProvider');
  }
  return context;
}
