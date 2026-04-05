import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Download, Shield, Copy, RefreshCw,
  ToggleLeft, ToggleRight, AlertTriangle, Wifi, Info,
  CheckCircle2, Users, Clock, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';

// ── Types ──────────────────────────────────────────────────

interface SellerPermissions {
  customers: boolean;
  quotes: boolean;
  sales: boolean;
  products: boolean;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  authorized: boolean;
  token: string | null;
  permissions: SellerPermissions;
  lastLogin: string | null;
  lastSync: string | null;
}

interface MobileSettings {
  globalEnabled: boolean;
  sellers: Seller[];
  stats: {
    authorizedCount: number;
    activeToday: number;
    totalSellers: number;
  };
  download: {
    available: boolean;
    url: string | null;
    appName: string;
    appVersion: string;
    platform: string;
    fileSize: number;
  };
}

// ── Helpers ────────────────────────────────────────────────

function relativeTime(date: string | null): string {
  if (!date) return 'Nunca';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  if (days < 30) return `há ${days}d`;
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── Permission pill labels ─────────────────────────────────

const PERMISSION_LABELS: { key: keyof SellerPermissions; label: string }[] = [
  { key: 'customers', label: 'Clientes' },
  { key: 'quotes', label: 'Orçamentos' },
  { key: 'sales', label: 'Vendas' },
  { key: 'products', label: 'Produtos' },
];

// ── Component ──────────────────────────────────────────────

export function MobileAppPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.USERS,
    message: 'Você não tem permissão para acessar esta página.',
  });
  if (permissionCheck) return permissionCheck;

  return <MobileAppPageContent />;
}

function MobileAppPageContent() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingGlobal, setUpdatingGlobal] = useState(false);
  const [updatingSeller, setUpdatingSeller] = useState<string | null>(null);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [confirmDeauth, setConfirmDeauth] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);

  // ── Data fetching ──

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/mobile-app/settings');
      setSettings(data.data);
    } catch {
      toast.error('Erro ao carregar configurações do aplicativo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Global toggle ──

  const handleGlobalToggle = async () => {
    if (!settings) return;
    setUpdatingGlobal(true);
    try {
      const { data } = await api.patch('/mobile-app/settings', {
        enabled: !settings.globalEnabled,
      });
      setSettings((prev) =>
        prev ? { ...prev, globalEnabled: data.data.enabled } : prev
      );
      toast.success(
        data.data.enabled ? 'Aplicativo habilitado' : 'Aplicativo desabilitado'
      );
    } catch {
      toast.error('Erro ao atualizar configuração');
    } finally {
      setUpdatingGlobal(false);
    }
  };

  // ── Seller authorization toggle ──

  const handleToggleAuthorized = async (seller: Seller) => {
    if (seller.authorized && confirmDeauth !== seller.id) {
      setConfirmDeauth(seller.id);
      return;
    }
    setConfirmDeauth(null);
    setUpdatingSeller(seller.id);
    try {
      const { data } = await api.patch(
        `/mobile-app/sellers/${seller.id}/authorize`,
        { authorized: !seller.authorized }
      );
      setSettings((prev) => {
        if (!prev) return prev;
        const sellers = prev.sellers.map((s) =>
          s.id === seller.id
            ? { ...s, authorized: data.data.authorized, token: data.data.token ?? s.token }
            : s
        );
        const authorizedCount = sellers.filter((s) => s.authorized).length;
        return {
          ...prev,
          sellers,
          stats: { ...prev.stats, authorizedCount },
        };
      });
      toast.success(
        data.data.authorized
          ? `${seller.name} autorizado no app`
          : `${seller.name} removido do app`
      );
      // Auto-show token when newly authorized
      if (data.data.authorized && data.data.token) {
        setVisibleTokens((prev) => new Set(prev).add(seller.id));
      }
    } catch {
      toast.error('Erro ao alterar autorização');
    } finally {
      setUpdatingSeller(null);
    }
  };

  // ── Seller permissions ──

  const handleTogglePermission = async (
    seller: Seller,
    permKey: keyof SellerPermissions
  ) => {
    setUpdatingSeller(seller.id);
    const newPerms = { ...seller.permissions, [permKey]: !seller.permissions[permKey] };
    try {
      await api.patch(`/mobile-app/sellers/${seller.id}/permissions`, newPerms);
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sellers: prev.sellers.map((s) =>
            s.id === seller.id ? { ...s, permissions: newPerms } : s
          ),
        };
      });
    } catch {
      toast.error('Erro ao atualizar permissões');
    } finally {
      setUpdatingSeller(null);
    }
  };

  // ── Regenerate token ──

  const handleRegenerateToken = async (seller: Seller) => {
    if (confirmRegen !== seller.id) {
      setConfirmRegen(seller.id);
      return;
    }
    setConfirmRegen(null);
    setUpdatingSeller(seller.id);
    try {
      const { data } = await api.post(
        `/mobile-app/sellers/${seller.id}/regenerate-token`
      );
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sellers: prev.sellers.map((s) =>
            s.id === seller.id ? { ...s, token: data.data.token } : s
          ),
        };
      });
      setVisibleTokens((prev) => new Set(prev).add(seller.id));
      toast.success('Novo token gerado com sucesso');
    } catch {
      toast.error('Erro ao regenerar token');
    } finally {
      setUpdatingSeller(null);
    }
  };

  // ── Token visibility ──

  const toggleTokenVisibility = (sellerId: string) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      if (next.has(sellerId)) next.delete(sellerId);
      else next.add(sellerId);
      return next;
    });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copiado!');
  };

  // ── Download ──

  const handleDownload = () => {
    if (!settings?.download?.url) {
      toast.error('APK não disponível para download');
      return;
    }
    if (settings.download.url.startsWith('http')) {
      window.open(settings.download.url, '_blank');
    } else {
      const baseUrl = api.defaults.baseURL || '';
      window.open(`${baseUrl}${settings.download.url}`, '_blank');
    }
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const sellers = settings?.sellers ?? [];
  const stats = settings?.stats ?? { authorizedCount: 0, activeToday: 0, totalSellers: 0 };
  const download = settings?.download;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Smartphone className="w-7 h-7 text-blue-600" />
          Aplicativo Celular
        </h1>
        <p className="text-gray-500 mt-1">
          Gerencie o acesso individual de cada vendedor ao aplicativo Android
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Authorized sellers */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vendedores Autorizados
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.authorizedCount}
                <span className="text-base font-normal text-gray-400">
                  {' '}/ {stats.totalSellers}
                </span>
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active today */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ativos Hoje
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.activeToday}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Global toggle */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                App Global
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {settings?.globalEnabled ? 'Habilitado' : 'Desabilitado'}
              </p>
            </div>
            <button
              onClick={handleGlobalToggle}
              disabled={updatingGlobal}
              className="disabled:opacity-50"
              title={settings?.globalEnabled ? 'Desabilitar app' : 'Habilitar app'}
            >
              {settings?.globalEnabled ? (
                <ToggleRight className="w-10 h-10 text-green-500" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Disabled warning */}
      {!settings?.globalEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            O aplicativo está desabilitado globalmente. Nenhum vendedor conseguirá fazer login pelo celular, mesmo que esteja autorizado individualmente.
          </p>
        </div>
      )}

      {/* ── Sellers Table ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Vendedores
          </h2>
          <span className="text-sm text-gray-400 ml-1">
            ({sellers.length})
          </span>
        </div>

        {sellers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">
              Nenhum vendedor cadastrado
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Cadastre vendedores com perfil SALESPERSON para que apareçam aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Autorizado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissões
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Sync
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellers.map((seller) => {
                  const isUpdating = updatingSeller === seller.id;
                  const tokenVisible = visibleTokens.has(seller.id);

                  return (
                    <tr key={seller.id} className="hover:bg-gray-50">
                      {/* Vendedor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {seller.name}
                          </p>
                          <p className="text-xs text-gray-500">{seller.email}</p>
                        </div>
                      </td>

                      {/* Autorizado toggle */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {confirmDeauth === seller.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs text-red-600 whitespace-nowrap">
                              Perderá acesso
                            </span>
                            <button
                              onClick={() => handleToggleAuthorized(seller)}
                              disabled={isUpdating}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDeauth(null)}
                              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggleAuthorized(seller)}
                            disabled={isUpdating}
                            className="disabled:opacity-50 inline-flex"
                            title={seller.authorized ? 'Revogar acesso' : 'Autorizar acesso'}
                          >
                            {seller.authorized ? (
                              <ToggleRight className="w-8 h-8 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>

                      {/* Permissões */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {seller.authorized ? (
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {PERMISSION_LABELS.map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => handleTogglePermission(seller, key)}
                                disabled={isUpdating}
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                                  seller.permissions[key]
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={`${seller.permissions[key] ? 'Desativar' : 'Ativar'} ${label}`}
                              >
                                {seller.permissions[key] && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Token */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {seller.authorized && seller.token ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600 max-w-[140px] truncate">
                              {tokenVisible
                                ? seller.token
                                : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                            </code>
                            <button
                              onClick={() => toggleTokenVisibility(seller.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title={tokenVisible ? 'Ocultar token' : 'Mostrar token'}
                            >
                              {tokenVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyToken(seller.token!)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Copiar token"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {confirmRegen === seller.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <span className="text-xs text-red-600 whitespace-nowrap">
                                  Invalidar?
                                </span>
                                <button
                                  onClick={() => handleRegenerateToken(seller)}
                                  disabled={isUpdating}
                                  className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmRegen(null)}
                                  className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-300"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRegenerateToken(seller)}
                                disabled={isUpdating}
                                className="p-1 text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                                title="Regenerar token"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : seller.authorized ? (
                          <span className="text-xs text-gray-400">Sem token</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Último Login */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {seller.authorized ? (
                          <span className="text-sm text-gray-600">
                            {relativeTime(seller.lastLogin)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Último Sync */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {seller.authorized ? (
                          <span className="text-sm text-gray-600">
                            {relativeTime(seller.lastSync)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Download Card ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {download?.appName || 'EJR Vendedor'}
              </h2>
              <p className="text-blue-100 text-sm">
                v{download?.appVersion || '1.0.0'} &middot;{' '}
                {download?.platform || 'Android'} &middot;{' '}
                {formatFileSize(download?.fileSize || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <button
            onClick={handleDownload}
            disabled={!download?.available}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Baixar APK
          </button>
          {!download?.available && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Configure MOBILE_APP_DOWNLOAD_URL no servidor para disponibilizar o download.
            </p>
          )}
        </div>
      </div>

      {/* ── Offline badge ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Wifi className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-800">Modo Offline</p>
          <p className="text-sm text-amber-700 mt-1">
            O app armazena dados localmente e sincroniza automaticamente quando o vendedor reconectar à internet.
          </p>
        </div>
      </div>

      {/* ── Instructions Card ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Instruções de Instalação
        </h3>
        <ol className="space-y-3">
          {[
            'Baixe o arquivo APK no celular Android do vendedor',
            'Abra o arquivo baixado no celular',
            'Se solicitado, permita a instalação de "fontes desconhecidas" nas configurações do Android',
            'Toque em "Instalar" e aguarde a instalação',
            'Abra o app e insira: email e senha do vendedor',
            'Informe o Token individual do vendedor (gerado automaticamente ao autorizar acima)',
            'Na primeira vez, conecte à internet para sincronizar os dados',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
