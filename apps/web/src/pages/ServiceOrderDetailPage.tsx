import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  CheckCircle,
  XCircle,
  Plus,
  Calendar,
  User,
  Package,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useServiceOrder,
  useCompleteServiceOrder,
  useUpdateServiceOrder,
  useAddServicePart,
  useRemoveServicePart,
} from '../hooks/useServiceOrders';
import { ServiceOrderStatusBadge } from '../components/service-orders/ServiceOrderStatusBadge';
import { ServicePartsTable } from '../components/service-orders/ServicePartsTable';
import { AddServicePartModal } from '../components/service-orders/AddServicePartModal';
import { useFormatPrice } from '../hooks/useFormatPrice';

export function ServiceOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const { formatPrice } = useFormatPrice();

  const { data: serviceOrder, isLoading } = useServiceOrder(id);
  const completeOrderMutation = useCompleteServiceOrder();
  const updateOrderMutation = useUpdateServiceOrder();
  const addPartMutation = useAddServicePart();
  const removePartMutation = useRemoveServicePart();

  const handleComplete = async () => {
    if (!id) return;
    if (!confirm('Deseja marcar esta ordem de serviço como concluída?')) return;

    try {
      await completeOrderMutation.mutateAsync(id);
      toast.success('Ordem de serviço concluída com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao concluir ordem de serviço');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Deseja cancelar esta ordem de serviço?')) return;

    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: { status: 'CANCELLED' },
      });
      toast.success('Ordem de serviço cancelada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar ordem de serviço');
    }
  };

  const handleAddPart = async (data: { productId: string; quantity: number }) => {
    if (!id) return;

    try {
      await addPartMutation.mutateAsync({
        serviceOrderId: id,
        data,
      });
      toast.success('Peça adicionada com sucesso');
      setShowAddPartModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar peça');
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!id) return;
    if (!confirm('Deseja remover esta peça?')) return;

    try {
      await removePartMutation.mutateAsync({
        serviceOrderId: id,
        partId,
      });
      toast.success('Peça removida com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover peça');
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      await updateOrderMutation.mutateAsync({
        id,
        data: { internalNotes },
      });
      toast.success('Notas salvas com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar notas');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  if (!serviceOrder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-600">Ordem de serviço não encontrada</div>
      </div>
    );
  }

  const canEdit =
    serviceOrder.status !== 'COMPLETED' && serviceOrder.status !== 'CANCELLED';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/service-orders')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Ordens de Serviço
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                OS #{serviceOrder.orderNumber}
              </h1>
              <p className="text-gray-600 mt-1">
                Entrada: {formatDate(serviceOrder.entryDate)}
              </p>
            </div>
            <ServiceOrderStatusBadge status={serviceOrder.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Gerais */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Gerais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceOrder.customer && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-medium text-gray-900">
                        {serviceOrder.customer.name}
                      </p>
                      {serviceOrder.customer.phone && (
                        <p className="text-sm text-gray-600">
                          {serviceOrder.customer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {serviceOrder.product && (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Produto</p>
                      <p className="font-medium text-gray-900">
                        {serviceOrder.product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {serviceOrder.product.code}
                      </p>
                    </div>
                  </div>
                )}

                {serviceOrder.technician && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Técnico</p>
                      <p className="font-medium text-gray-900">
                        {serviceOrder.technician.name}
                      </p>
                    </div>
                  </div>
                )}

                {serviceOrder.estimatedDelivery && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Entrega Estimada</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(serviceOrder.estimatedDelivery)}
                      </p>
                    </div>
                  </div>
                )}

                {serviceOrder.isWarranty && (
                  <div className="md:col-span-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      Serviço em Garantia
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição do Problema */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Descrição do Problema
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {serviceOrder.issueDescription || 'Não informado'}
              </p>
              {serviceOrder.customerNotes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Observações do Cliente:
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {serviceOrder.customerNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Diagnóstico e Serviço */}
            {(serviceOrder.diagnosis || serviceOrder.servicePerformed) && (
              <div className="bg-white rounded-lg shadow p-4 lg:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Diagnóstico e Serviço
                </h2>
                {serviceOrder.diagnosis && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Diagnóstico:
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {serviceOrder.diagnosis}
                    </p>
                  </div>
                )}
                {serviceOrder.servicePerformed && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Serviço Realizado:
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {serviceOrder.servicePerformed}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Peças Utilizadas */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Peças Utilizadas
                </h2>
                {canEdit && (
                  <button
                    onClick={() => setShowAddPartModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Peça
                  </button>
                )}
              </div>
              <ServicePartsTable
                serviceOrder={serviceOrder}
                onRemovePart={canEdit ? handleRemovePart : undefined}
                readOnly={!canEdit}
              />
            </div>

            {/* Notas Internas */}
            {canEdit && (
              <div className="bg-white rounded-lg shadow p-4 lg:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Notas Internas
                </h2>
                <textarea
                  value={internalNotes || serviceOrder.internalNotes || ''}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Adicione notas internas (não visíveis ao cliente)..."
                />
                <button
                  onClick={handleSaveNotes}
                  className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  disabled={updateOrderMutation.isPending}
                >
                  {updateOrderMutation.isPending ? 'Salvando...' : 'Salvar Notas'}
                </button>
              </div>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Custos */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Custos</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mão de Obra:</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(serviceOrder.laborCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Peças:</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(serviceOrder.partsCost)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(serviceOrder.totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="bg-white rounded-lg shadow p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/service-orders/${id}/edit`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
                {canEdit && (
                  <>
                    <button
                      onClick={handleComplete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                      disabled={completeOrderMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Concluir OS
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                      disabled={updateOrderMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar OS
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Timeline */}
            {serviceOrder.completionDate && (
              <div className="bg-white rounded-lg shadow p-4 lg:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Datas
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Entrada:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(serviceOrder.entryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Conclusão:</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(serviceOrder.completionDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddServicePartModal
        isOpen={showAddPartModal}
        onClose={() => setShowAddPartModal(false)}
        onAdd={handleAddPart}
        isLoading={addPartMutation.isPending}
      />
    </div>
  );
}
