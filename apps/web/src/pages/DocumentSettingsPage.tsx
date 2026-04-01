import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDocumentSettings,
  useDeleteDocumentSettings,
  useSetDefaultDocumentSettings,
} from '../hooks/useDocumentSettings';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';
import { FileText, Edit, Trash2, Star, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentSettingsPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.DOCUMENT_SETTINGS,
    message: 'Você não tem permissão para acessar as configurações de documentos.'
  });
  if (permissionCheck) return permissionCheck;

  const navigate = useNavigate();
  const { data: settings, isLoading } = useDocumentSettings();
  const deleteSettings = useDeleteDocumentSettings();
  const setAsDefault = useSetDefaultDocumentSettings();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteSettings.mutateAsync(id);
      toast.success('Configuração deletada com sucesso!');
      setDeleteConfirmId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao deletar configuração');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setAsDefault.mutateAsync(id);
      toast.success('Configuração definida como padrão!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao definir como padrão');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Configurações de Documentos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie perfis de configuração para geração de PDFs e documentos
          </p>
        </div>
        <button
          onClick={() => navigate('/settings/document-settings/new')}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Configuração
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings?.map((setting) => (
          <div
            key={setting.id}
            className={`bg-white rounded-lg shadow p-6 border-2 ${
              setting.isDefault ? 'border-yellow-400' : 'border-transparent'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">{setting.profileName}</h3>
                  {setting.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      <Star className="w-3 h-3" />
                      Padrão
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {setting.companyName && (
                <div>
                  <strong>Empresa:</strong> {setting.companyName}
                </div>
              )}
              {setting.signatureName && (
                <div>
                  <strong>Assinatura:</strong> {setting.signatureName}
                  {setting.signatureRole && ` - ${setting.signatureRole}`}
                </div>
              )}
              <div>
                <strong>Validade padrão:</strong> {setting.defaultQuoteValidityDays} dias
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {!setting.isDefault && (
                <button
                  onClick={() => handleSetDefault(setting.id)}
                  className="flex-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 text-sm flex items-center justify-center gap-1"
                  title="Definir como padrão"
                >
                  <Star className="w-4 h-4" />
                  Padrão
                </button>
              )}
              <button
                onClick={() => navigate(`/settings/document-settings/edit/${setting.id}`)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm flex items-center justify-center gap-1"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              {deleteConfirmId === setting.id ? (
                <div className="flex-1 flex gap-1">
                  <button
                    onClick={() => handleDelete(setting.id)}
                    className="flex-1 px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-2 py-2 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(setting.id)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm flex items-center justify-center gap-1"
                  title="Deletar"
                  disabled={setting.isDefault}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {settings?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma configuração encontrada
          </h3>
          <p className="text-gray-600 mb-6">
            Crie uma configuração para personalizar seus documentos e PDFs
          </p>
          <button
            onClick={() => navigate('/settings/document-settings/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Criar Primeira Configuração
          </button>
        </div>
      )}
    </div>
  );
}
