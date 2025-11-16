import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useServiceOrder,
  useCreateServiceOrder,
  useUpdateServiceOrder,
} from '../hooks/useServiceOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import type { ServiceOrderStatus } from '@ejr/shared-types';

export function ServiceOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: serviceOrder, isLoading: loadingOrder } = useServiceOrder(id);
  const { data: customersData } = useCustomers({ limit: 1000 });
  const { data: productsData } = useProducts({ limit: 1000 });
  const createOrder = useCreateServiceOrder();
  const updateOrder = useUpdateServiceOrder();

  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    technicianId: '',
    isWarranty: false,
    issueDescription: '',
    customerNotes: '',
    estimatedDelivery: '',
    // Campos adicionais para edição
    status: 'OPEN' as ServiceOrderStatus,
    diagnosis: '',
    servicePerformed: '',
    internalNotes: '',
    laborCost: 0,
  });

  useEffect(() => {
    if (serviceOrder) {
      setFormData({
        customerId: serviceOrder.customerId,
        productId: serviceOrder.productId,
        technicianId: serviceOrder.technicianId || '',
        isWarranty: serviceOrder.isWarranty,
        issueDescription: serviceOrder.issueDescription || '',
        customerNotes: serviceOrder.customerNotes || '',
        estimatedDelivery: serviceOrder.estimatedDelivery
          ? new Date(serviceOrder.estimatedDelivery).toISOString().split('T')[0]
          : '',
        status: serviceOrder.status,
        diagnosis: serviceOrder.diagnosis || '',
        servicePerformed: serviceOrder.servicePerformed || '',
        internalNotes: serviceOrder.internalNotes || '',
        laborCost: serviceOrder.laborCost,
      });
    }
  }, [serviceOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.productId || !formData.issueDescription) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (isEditing) {
        await updateOrder.mutateAsync({
          id: id!,
          data: {
            technicianId: formData.technicianId || undefined,
            status: formData.status,
            diagnosis: formData.diagnosis || undefined,
            servicePerformed: formData.servicePerformed || undefined,
            internalNotes: formData.internalNotes || undefined,
            laborCost: formData.laborCost,
            estimatedDelivery: formData.estimatedDelivery || undefined,
          },
        });
        toast.success('Ordem de serviço atualizada com sucesso');
      } else {
        await createOrder.mutateAsync({
          customerId: formData.customerId,
          productId: formData.productId,
          technicianId: formData.technicianId || undefined,
          isWarranty: formData.isWarranty,
          issueDescription: formData.issueDescription,
          customerNotes: formData.customerNotes || undefined,
          estimatedDelivery: formData.estimatedDelivery || undefined,
        });
        toast.success('Ordem de serviço criada com sucesso');
      }
      navigate('/service-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar ordem de serviço');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'laborCost') {
      const numValue = parseFloat(value) || 0;
      setFormData((prev) => ({ ...prev, [name]: Math.round(numValue * 100) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => navigate('/service-orders')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar para Ordens de Serviço
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Informações Básicas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Básicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    required
                    disabled={isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Selecione um cliente</option>
                    {customersData?.data?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produto <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    required
                    disabled={isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Selecione um produto</option>
                    {productsData?.data?.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Técnico
                  </label>
                  <input
                    type="text"
                    name="technicianId"
                    value={formData.technicianId}
                    onChange={handleChange}
                    placeholder="ID do técnico (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Estimada de Entrega
                  </label>
                  <input
                    type="date"
                    name="estimatedDelivery"
                    value={formData.estimatedDelivery}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isWarranty"
                      checked={formData.isWarranty}
                      onChange={handleChange}
                      disabled={isEditing}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      É garantia?
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Descrição do Problema */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Descrição do Problema
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problema Relatado <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="issueDescription"
                    value={formData.issueDescription}
                    onChange={handleChange}
                    required
                    disabled={isEditing}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Descreva o problema relatado pelo cliente..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações do Cliente
                  </label>
                  <textarea
                    name="customerNotes"
                    value={formData.customerNotes}
                    onChange={handleChange}
                    disabled={isEditing}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Observações adicionais do cliente..."
                  />
                </div>
              </div>
            </div>

            {/* Campos de Edição */}
            {isEditing && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Atendimento
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OPEN">Aberta</option>
                        <option value="AWAITING_PARTS">Aguardando Peças</option>
                        <option value="IN_SERVICE">Em Atendimento</option>
                        <option value="AWAITING_APPROVAL">
                          Aguardando Aprovação
                        </option>
                        <option value="COMPLETED">Concluída</option>
                        <option value="CANCELLED">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Diagnóstico
                      </label>
                      <textarea
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Diagnóstico técnico do problema..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Serviço Realizado
                      </label>
                      <textarea
                        name="servicePerformed"
                        value={formData.servicePerformed}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descreva o serviço realizado..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custo de Mão de Obra (R$)
                      </label>
                      <input
                        type="number"
                        name="laborCost"
                        value={formatCurrency(formData.laborCost)}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas Internas
                      </label>
                      <textarea
                        name="internalNotes"
                        value={formData.internalNotes}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notas internas (não visíveis ao cliente)..."
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botões */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => navigate('/service-orders')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              disabled={createOrder.isPending || updateOrder.isPending}
            >
              {createOrder.isPending || updateOrder.isPending
                ? 'Salvando...'
                : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
