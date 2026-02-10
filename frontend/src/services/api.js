import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token JWT e API Key do tablet
api.interceptors.request.use((config) => {
  // Adicionar token JWT para usuários logados
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Adicionar token do dispositivo autorizado para rotas do tablet
  const tabletToken = localStorage.getItem('tablet_token');
  if (tabletToken && config.url && (config.url.includes('/tablet') || config.url.includes('/duty-shifts') || config.url.includes('/matricula'))) {
    config.headers['X-Tablet-Token'] = tabletToken;
  }

  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Não redirecionar se for uma rota de tablet
      const isTabletRoute = error.config?.url?.includes('/tablet');
      if (!isTabletRoute) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;