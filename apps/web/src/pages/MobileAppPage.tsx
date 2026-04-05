import { useState, useEffect } from 'react';
import {
  Smartphone, Download, CheckCircle2, Shield, Key, Copy, RefreshCw,
  ToggleLeft, ToggleRight, AlertTriangle, Wifi, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';

interface MobileSettings {
  enabled: boolean;
  apiKey: string | null;
  appVersion: string;
  appName: string;
  platform: string;
  package: string;
  fileSize: number;
  downloadAvailable: boolean;
  downloadUrl: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function MobileAppPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.USERS,
    message: 'Você não tem permissão para acessar esta página.'
  });
  if (permissionCheck) return permissionCheck;

  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/mobile-app/settings');
      setSettings(data.data);
    } catch {
      toast.error('Erro ao carregar configurações do aplicativo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleToggle = async () => {
    if (!settings) return;
    setUpdating(true);
    try {
      const { data } = await api.patch('/mobile-app/settings', { enabled: !settings.enabled });
      setSettings(prev => prev ? { ...prev, enabled: data.data.enabled, apiKey: data.data.apiKey } : prev);
      toast.success(data.data.enabled ? 'Aplicativo habilitado' : 'Aplicativo desabilitado');
    } catch {
      toast.error('Erro ao atualizar configuração');
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateKey = async () => {
    setShowRegenConfirm(false);
    setUpdating(true);
    try {
      const { data } = await api.patch('/mobile-app/settings', { regenerateKey: true });
      setSettings(prev => prev ? { ...prev, apiKey: data.data.apiKey } : prev);
      toast.success('Nova chave gerada. Todos os vendedores precisarão da nova chave.');
    } catch {
      toast.error('Erro ao gerar nova chave');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyKey = () => {
    if (settings?.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
      toast.success('Chave copiada!');
    }
  };

  const handleDownload = () => {
    if (!settings?.downloadUrl) {
      toast.error('APK não disponível para download');
      return;
    }
    if (settings.downloadUrl.startsWith('http')) {
      window.open(settings.downloadUrl, '_blank');
    } else {
      const baseUrl = api.defaults.baseURL || '';
      window.open(`${baseUrl}${settings.downloadUrl}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Smartphone className="w-7 h-7 text-blue-600" />
          Aplicativo Celular
        </h1>
        <p className="text-gray-500 mt-1">
          Configure o acesso do aplicativo Android para vendedores externos
        </p>
      </div>

      {/* Authorization Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Autorização de Conexão</h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Habilitar Aplicativo</p>
              <p className="text-sm text-gray-500">Permitir que vendedores conectem via aplicativo celular</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={updating}
              className="flex items-center gap-2 disabled:opacity-50"
            >
              {settings?.enabled ? (
                <ToggleRight className="w-10 h-10 text-green-500" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-400" />
              )}
            </button>
          </div>

          {/* API Key Section */}
          {settings?.enabled && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <p className="font-medium text-gray-900 text-sm">Chave de Conexão</p>
              </div>

              {settings.apiKey ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings.apiKey}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-700 select-all"
                    />
                    <button
                      onClick={handleCopyKey}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Copiar chave"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Compartilhe esta chave apenas com vendedores autorizados
                    </p>
                    {!showRegenConfirm ? (
                      <button
                        onClick={() => setShowRegenConfirm(true)}
                        disabled={updating}
                        className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Gerar nova chave
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Desconectar todos?</span>
                        <button
                          onClick={handleRegenerateKey}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setShowRegenConfirm(false)}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Chave será gerada automaticamente.</p>
              )}
            </div>
          )}

          {/* Disabled warning */}
          {!settings?.enabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                O aplicativo está desabilitado. Nenhum vendedor conseguirá fazer login pelo celular.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Download Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{settings?.appName || 'EJR Vendedor'}</h2>
              <p className="text-blue-100 text-sm">
                v{settings?.appVersion || '1.0.0'} &middot; {settings?.platform || 'Android'} &middot; {formatFileSize(settings?.fileSize || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <button
            onClick={handleDownload}
            disabled={!settings?.downloadAvailable}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Baixar APK
          </button>
          {!settings?.downloadAvailable && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Configure MOBILE_APP_DOWNLOAD_URL no servidor para disponibilizar o download.
            </p>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Funcionalidades
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Cadastro de clientes',
            'Criação de orçamentos',
            'Registro de vendas',
            'Consulta de produtos e preços',
            'Dashboard com estatísticas',
            'Funciona offline em campo',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Offline badge */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Wifi className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-800">Modo Offline</p>
          <p className="text-sm text-amber-700 mt-1">
            O app armazena dados localmente e sincroniza automaticamente quando o vendedor reconectar à internet.
          </p>
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Instruções de Instalação
        </h3>
        <ol className="space-y-3">
          {[
            'Baixe o arquivo APK no celular Android do vendedor',
            'Abra o arquivo baixado no celular',
            'Se solicitado, permita a instalação de "fontes desconhecidas" nas configurações do Android',
            'Toque em "Instalar" e aguarde a instalação',
            'Abra o app e insira: email, senha e a Chave de Conexão fornecida pelo administrador',
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
