import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
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

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Necessario: cookies HttpOnly de auth + cookie csrfToken viajam aqui.
  withCredentials: true,
});

/**
 * Le um cookie pelo nome (cookies nao-HttpOnly como csrfToken).
 */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const SAFE_METHODS = new Set(['get', 'head', 'options']);

// Request interceptor — anexa CSRF token em mutations.
// REMOVIDO: leitura/escrita de localStorage do JWT. Web usa cookies HttpOnly.
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = (config.method || 'get').toLowerCase();
    if (!SAFE_METHODS.has(method)) {
      const csrf = readCookie('csrfToken');
      if (csrf) {
        config.headers = config.headers || {};
        (config.headers as any)['X-CSRF-Token'] = csrf;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Refresh logic com fila de espera --------------------------------------
let isRefreshing = false;
let refreshWaiters: Array<(ok: boolean) => void> = [];

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => refreshWaiters.push(resolve));
  }
  isRefreshing = true;
  try {
    // Endpoint NAO carrega CSRF (esta antes do middleware), mas precisa
    // do cookie refreshToken (HttpOnly) para validar.
    await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    refreshWaiters.forEach((cb) => cb(true));
    refreshWaiters = [];
    return true;
  } catch {
    refreshWaiters.forEach((cb) => cb(false));
    refreshWaiters = [];
    return false;
  } finally {
    isRefreshing = false;
  }
}

// Response interceptor — trata 401 com refresh + retry, e mensagens de erro.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // 401 com TOKEN_EXPIRED: tentamos refresh + retry da request original.
    if (
      status === 401 &&
      errorCode === 'TOKEN_EXPIRED' &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original._retry = true;
      const ok = await attemptRefresh();
      if (ok) {
        return api.request(original);
      }
      // Refresh falhou — redireciona para login.
      if (window.location.pathname !== '/login') {
        toast.error('Sessao expirada. Faca login novamente.');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (status === 401) {
      if (window.location.pathname !== '/login') {
        // 401 sem TOKEN_EXPIRED: token invalido / sem token / mobile bloqueado.
        // Nao deslogamos automatico aqui (poderia ser uma rota especifica).
      }
    }

    // Erros de permissao
    if (status === 403 && errorCode !== 'CSRF_INVALID') {
      toast.error('Voce nao tem permissao para realizar esta acao.');
    }
    if (status === 403 && errorCode === 'CSRF_INVALID') {
      toast.error('Sessao invalida. Recarregue a pagina e tente novamente.');
    }

    if ((status ?? 0) >= 500) {
      toast.error('Erro no servidor. Tente novamente mais tarde.');
    }

    return Promise.reject(error);
  }
);
