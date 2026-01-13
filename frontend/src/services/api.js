import axios from 'axios';

// API Key para autenticação do tablet
// IMPORTANTE: Em produção, use uma variável de ambiente segura
const TABLET_API_KEY = import.meta.env.VITE_TABLET_API_KEY || 'tabletPontoImob2026SecureKey@Aux';

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

  // Adicionar API Key para rotas do tablet
  // Isso permite que o tablet funcione sem login, mas com autenticação
  if (config.url && (config.url.includes('/tablet') || config.url.includes('/duty-shifts'))) {
    config.headers['X-Tablet-API-Key'] = TABLET_API_KEY;
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