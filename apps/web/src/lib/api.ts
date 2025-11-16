import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies HTTP-only
});

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
      toast.error('Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
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
