import axios from 'axios';
import { toast } from 'sonner';

// Detecta automaticamente o endpoint da API
const getApiUrl = () => {
  // Se variavel de ambiente definida (build time), usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;

  // Acesso local direto (desenvolvimento)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3002/api/v1';
  }

  // Acesso por IP da rede local (ex: 192.168.x.x)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `http://${hostname}:3002/api/v1`;
  }

  // Producao ou tunel: URL relativa (Vercel rewrite ou Vite proxy)
  return '/api/v1';
};

const API_BASE_URL = getApiUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies HTTP-only
});

// Add token to requests from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);
    const message = error.response?.data?.error?.message || 'Ocorreu um erro inesperado';

    // Erros de autenticação
    if (error.response?.status === 401) {
      // Só mostra mensagem e redireciona se:
      // 1. Não estiver na página de login
      // 2. Havia um token (ou seja, sessão expirou de verdade)
      const hadToken = localStorage.getItem('token');
      if (window.location.pathname !== '/login' && hadToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (window.location.pathname !== '/login' && !hadToken) {
        // Sem token e não está no login - redireciona silenciosamente
        window.location.href = '/login';
      }
    }

    // Erros de permissão
    if (error.response?.status === 403) {
      toast.error('Você não tem permissão para realizar esta ação.');
    }

    // Outros erros
    if (error.response?.status >= 500) {
      toast.error('Erro no servidor. Tente novamente mais tarde.');
    }

    return Promise.reject(error);
  }
);
