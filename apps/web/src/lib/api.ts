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
// 'ok'        → refresh deu certo (ou outra aba ja rotacionou) — re-tente a request.
// 'denied'    → refresh recusado definitivamente (401/403) — sessao acabou.
// 'transient' → erro temporario (rede, 429, 5xx) — NAO desloga, apenas falha a request.
type RefreshOutcome = 'ok' | 'denied' | 'transient';

let isRefreshing = false;
let refreshWaiters: Array<(outcome: RefreshOutcome) => void> = [];

async function attemptRefresh(): Promise<RefreshOutcome> {
  if (isRefreshing) {
    return new Promise<RefreshOutcome>((resolve) => refreshWaiters.push(resolve));
  }
  isRefreshing = true;
  let outcome: RefreshOutcome;
  try {
    // Endpoint NAO carrega CSRF (esta antes do middleware), mas precisa
    // do cookie refreshToken (HttpOnly) para validar.
    await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    outcome = 'ok';
  } catch (err: any) {
    const status = err?.response?.status;
    const code = err?.response?.data?.error?.code;
    if (code === 'REFRESH_RACE') {
      // Outra aba rotacionou o token ha instantes — os cookies novos ja estao
      // no browser. Tratamos como sucesso e re-tentamos a request original.
      outcome = 'ok';
    } else if (status === 401 || status === 403) {
      outcome = 'denied';
    } else {
      // Rede instavel, rate-limit (429), erro de servidor: NAO e fim de sessao.
      outcome = 'transient';
    }
  } finally {
    isRefreshing = false;
  }
  refreshWaiters.forEach((cb) => cb(outcome));
  refreshWaiters = [];
  return outcome;
}

const AUTH_URLS = ['/auth/refresh', '/auth/login', '/auth/logout'];

// Response interceptor — trata 401 com refresh + retry, e mensagens de erro.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Qualquer 401 (TOKEN_EXPIRED, token ausente, invalido): tentamos
    // refresh + retry da request original. O caso "cookie sumiu" tambem
    // se resolve com refresh — o refreshToken (7d) ainda esta no browser.
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !AUTH_URLS.some((u) => original.url?.includes(u))
    ) {
      original._retry = true;
      const outcome = await attemptRefresh();
      if (outcome === 'ok') {
        return api.request(original);
      }
      if (outcome === 'denied') {
        // Sessao realmente acabou. Para /auth/me deixamos o guard de rotas
        // cuidar do redirect (evita toast no primeiro acesso sem sessao).
        if (
          window.location.pathname !== '/login' &&
          !original.url?.includes('/auth/me')
        ) {
          toast.error('Sessao expirada. Faca login novamente.');
          window.location.href = '/login';
        }
      }
      // 'transient': falha a request sem deslogar — o usuario pode re-tentar.
      return Promise.reject(error);
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
