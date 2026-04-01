import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useService, useCreateService, useUpdateService } from '../hooks/useServices';
import { ServiceUnit } from '@ejr/shared-types';
import { toast } from 'sonner';
import { CurrencyInput } from '../components/CurrencyInput';

export function ServiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: service, isLoading: loadingService } = useService(id);
  const createService = useCreateService();
  const updateService = useUpdateService();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    defaultPrice: 0,
    unit: ServiceUnit.SERVICO,
    durationMinutes: 0,
    isActive: true,
  });

  useEffect(() => {
    if (service) {
      setFormData({
        code: service.code,
        name: service.name,
        description: service.description || '',
        category: service.category || '',
        defaultPrice: service.defaultPrice,
        unit: service.unit,
        durationMinutes: service.durationMinutes || 0,
        isActive: service.isActive,
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.code && !isEditing) {
      toast.error('Código é obrigatório');
      return;
    }

    if (formData.defaultPrice < 0) {
      toast.error('Preço não pode ser negativo');
      return;
    }

    if (formData.durationMinutes < 0) {
      toast.error('Duração não pode ser negativa');
      return;
    }

    try {
      if (isEditing) {
        await updateService.mutateAsync({
          id: id!,
          data: formData,
        });
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await createService.mutateAsync(formData);
        toast.success('Serviço criado com sucesso!');
      }
      navigate('/services');
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar serviço');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'durationMinutes') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loadingService) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <button
            onClick={() => navigate('/services')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar para Serviços
          </button>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.code}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : (
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SRV-0001"
                />
              )}
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do serviço"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Consultoria, Treinamento..."
              />
            </div>

            {/* Unidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ServiceUnit.HORA}>Hora</option>
                <option value={ServiceUnit.DIA}>Dia</option>
                <option value={ServiceUnit.SERVICO}>Serviço</option>
                <option value={ServiceUnit.PROJETO}>Projeto</option>
              </select>
            </div>

            {/* Preço Padrão */}
            <div>
              <CurrencyInput
                label="Preço Padrão"
                value={formData.defaultPrice}
                onChange={(cents) => setFormData({ ...formData, defaultPrice: cents })}
                required
              />
            </div>

            {/* Duração (minutos) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração (minutos)
              </label>
              <input
                type="number"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tempo estimado de execução do serviço
              </p>
            </div>

            {/* Status Ativo */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Serviço ativo
                </span>
              </label>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição detalhada do serviço..."
              />
            </div>
          </div>

          {/* Botões */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="submit"
              disabled={createService.isPending || updateService.isPending}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 min-h-[44px] rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createService.isPending || updateService.isPending
                ? 'Salvando...'
                : isEditing
                ? 'Atualizar'
                : 'Criar Serviço'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto bg-gray-200 text-gray-700 px-6 py-2 min-h-[44px] rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
