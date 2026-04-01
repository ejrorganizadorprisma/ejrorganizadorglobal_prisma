import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDocumentSettingsById,
  useCreateDocumentSettings,
  useUpdateDocumentSettings,
} from '../hooks/useDocumentSettings';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentSettingsFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: settings } = useDocumentSettingsById(id || '', { enabled: isEditing });
  const createSettings = useCreateDocumentSettings();
  const updateSettings = useUpdateDocumentSettings();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    profileName: '',
    isDefault: false,
    companyLogo: '',
    companyName: '',
    footerText: '',
    footerAddress: '',
    footerPhone: '',
    footerEmail: '',
    footerWebsite: '',
    signatureImage: '',
    signatureName: '',
    signatureRole: 'Diretor',
    defaultQuoteValidityDays: 30,
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        profileName: settings.profileName,
        isDefault: settings.isDefault,
        companyLogo: settings.companyLogo || '',
        companyName: settings.companyName || '',
        footerText: settings.footerText || '',
        footerAddress: settings.footerAddress || '',
        footerPhone: settings.footerPhone || '',
        footerEmail: settings.footerEmail || '',
        footerWebsite: settings.footerWebsite || '',
        signatureImage: settings.signatureImage || '',
        signatureName: settings.signatureName || '',
        signatureRole: settings.signatureRole || 'Diretor',
        defaultQuoteValidityDays: settings.defaultQuoteValidityDays,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
      });
    }
  }, [settings]);

  const handleImageUpload = (file: File, field: 'companyLogo' | 'signatureImage') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas imagens');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData((prev) => ({ ...prev, [field]: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.profileName.trim()) {
      toast.error('Nome do perfil é obrigatório');
      return;
    }

    if (formData.footerEmail && !formData.footerEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }

    try {
      const payload = {
        ...formData,
        companyLogo: formData.companyLogo || undefined,
        companyName: formData.companyName || undefined,
        footerText: formData.footerText || undefined,
        footerAddress: formData.footerAddress || undefined,
        footerPhone: formData.footerPhone || undefined,
        footerEmail: formData.footerEmail || undefined,
        footerWebsite: formData.footerWebsite || undefined,
        signatureImage: formData.signatureImage || undefined,
        signatureName: formData.signatureName || undefined,
        signatureRole: formData.signatureRole || undefined,
      };

      if (isEditing) {
        await updateSettings.mutateAsync({ id: id!, data: payload });
        toast.success('Configuração atualizada!');
      } else {
        await createSettings.mutateAsync(payload);
        toast.success('Configuração criada!');
      }
      navigate('/settings/document-settings');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/settings/document-settings')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Voltar para Configurações
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">
          {isEditing ? 'Editar Configuração' : 'Nova Configuração'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6 space-y-8">
        {/* Basic Info */}
        <section>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nome do Perfil *</label>
              <input
                type="text"
                value={formData.profileName}
                onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ex: Configuração Padrão, Filial Sul, etc."
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Definir como configuração padrão</span>
              </label>
            </div>
          </div>
        </section>

        {/* Company Branding */}
        <section>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Identidade Visual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="EJR ORGANIZADOR"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Logomarca da Empresa</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'companyLogo');
                }}
                className="hidden"
              />
              <div className="flex gap-4 items-start">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Selecionar Imagem
                </button>
                {formData.companyLogo && (
                  <div className="relative">
                    <img
                      src={formData.companyLogo}
                      alt="Logo Preview"
                      className="h-20 w-auto border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, companyLogo: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {!formData.companyLogo && (
                  <div className="h-20 w-20 bg-gray-100 border rounded flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Máximo 5MB. PNG, JPG ou SVG.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cor Primária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-16 h-10 border rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cor Secundária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-16 h-10 border rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="#1e40af"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer Information */}
        <section>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Informações do Rodapé</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Texto do Rodapé</label>
              <input
                type="text"
                value={formData.footerText}
                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Obrigado pela preferência!"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Endereço</label>
              <input
                type="text"
                value={formData.footerAddress}
                onChange={(e) => setFormData({ ...formData, footerAddress: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Rua Exemplo, 123 - Centro - Cidade/UF"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <input
                type="text"
                value={formData.footerPhone}
                onChange={(e) => setFormData({ ...formData, footerPhone: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="(11) 1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.footerEmail}
                onChange={(e) => setFormData({ ...formData, footerEmail: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="text"
                value={formData.footerWebsite}
                onChange={(e) => setFormData({ ...formData, footerWebsite: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="www.empresa.com.br"
              />
            </div>
          </div>
        </section>

        {/* Signature Settings */}
        <section>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Configurações de Assinatura</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Responsável</label>
              <input
                type="text"
                value={formData.signatureName}
                onChange={(e) => setFormData({ ...formData, signatureName: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Função/Cargo</label>
              <select
                value={formData.signatureRole}
                onChange={(e) => setFormData({ ...formData, signatureRole: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="Diretor">Diretor</option>
                <option value="Admin TI">Admin TI</option>
                <option value="Vendedor">Vendedor</option>
                <option value="Representante Comercial">Representante Comercial</option>
                <option value="Coordenador">Coordenador</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Imagem da Assinatura</label>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'signatureImage');
                }}
                className="hidden"
              />
              <div className="flex gap-4 items-start">
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Selecionar Imagem
                </button>
                {formData.signatureImage && (
                  <div className="relative">
                    <img
                      src={formData.signatureImage}
                      alt="Signature Preview"
                      className="h-20 w-auto border rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, signatureImage: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {!formData.signatureImage && (
                  <div className="h-20 w-40 bg-gray-100 border rounded flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Opcional. Assinatura digitalizada ou rubrica. Máximo 5MB.
              </p>
            </div>
          </div>
        </section>

        {/* Quote Defaults */}
        <section>
          <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Configurações de Orçamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Validade Padrão (dias)</label>
              <input
                type="number"
                min="1"
                value={formData.defaultQuoteValidityDays}
                onChange={(e) =>
                  setFormData({ ...formData, defaultQuoteValidityDays: parseInt(e.target.value) || 30 })
                }
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número de dias que um orçamento permanece válido
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
          <button
            type="submit"
            disabled={createSettings.isPending || updateSettings.isPending}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createSettings.isPending || updateSettings.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar'
              : 'Criar Configuração'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/document-settings')}
            className="w-full sm:w-auto bg-gray-200 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
