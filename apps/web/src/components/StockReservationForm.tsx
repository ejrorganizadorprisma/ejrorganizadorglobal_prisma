import { useState } from 'react';
import { useCreateStockReservation, type ReservationType } from '../hooks/useStockReservations';
import { useProducts } from '../hooks/useProducts';

interface StockReservationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockReservationForm({ onSuccess, onCancel }: StockReservationFormProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reservedForType, setReservedForType] = useState<ReservationType>('MANUAL');
  const [reservedForId, setReservedForId] = useState('');
  const [reservedBy, setReservedBy] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: productsData } = useProducts({ limit: 1000 });
  const createMutation = useCreateStockReservation();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!productId) {
      newErrors.productId = 'Produto é obrigatório';
    }

    if (!quantity || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }

    if (!reservedForType) {
      newErrors.reservedForType = 'Tipo de reserva é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        productId,
        quantity: parseInt(quantity),
        reservedForType,
        reservedForId: reservedForId || undefined,
        reservedBy: reservedBy || undefined,
        reason: reason || undefined,
        expiresAt: expiresAt || undefined,
        notes: notes || undefined,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar reserva:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Produto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Produto <span className="text-red-500">*</span>
        </label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.productId ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Selecione um produto</option>
          {productsData?.data?.map((product) => (
            <option key={product.id} value={product.id}>
              {product.code} - {product.name} (Estoque: {product.currentStock})
            </option>
          ))}
        </select>
        {errors.productId && (
          <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
        )}
      </div>

      {/* Quantidade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantidade <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.quantity ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Digite a quantidade"
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
        )}
      </div>

      {/* Tipo de Reserva */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Reserva <span className="text-red-500">*</span>
        </label>
        <select
          value={reservedForType}
          onChange={(e) => setReservedForType(e.target.value as ReservationType)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.reservedForType ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="MANUAL">Manual</option>
          <option value="PRODUCTION_ORDER">Ordem de Produção</option>
          <option value="SERVICE_ORDER">Ordem de Serviço</option>
          <option value="QUOTE">Orçamento</option>
        </select>
        {errors.reservedForType && (
          <p className="mt-1 text-sm text-red-600">{errors.reservedForType}</p>
        )}
      </div>

      {/* ID da Referência */}
      {reservedForType !== 'MANUAL' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID da Referência ({reservedForType === 'PRODUCTION_ORDER' ? 'Ordem de Produção' : reservedForType === 'SERVICE_ORDER' ? 'Ordem de Serviço' : 'Orçamento'})
          </label>
          <input
            type="text"
            value={reservedForId}
            onChange={(e) => setReservedForId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o ID da referência"
          />
          <p className="mt-1 text-sm text-gray-500">
            Opcional: ID da {reservedForType === 'PRODUCTION_ORDER' ? 'ordem de produção' : reservedForType === 'SERVICE_ORDER' ? 'ordem de serviço' : 'orçamento'}
          </p>
        </div>
      )}

      {/* Reservado Por */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reservado Por
        </label>
        <input
          type="text"
          value={reservedBy}
          onChange={(e) => setReservedBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do responsável"
        />
        <p className="mt-1 text-sm text-gray-500">
          Opcional: Nome da pessoa que está fazendo a reserva
        </p>
      </div>

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Motivo
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Motivo da reserva"
        />
        <p className="mt-1 text-sm text-gray-500">
          Opcional: Breve descrição do motivo da reserva
        </p>
      </div>

      {/* Data de Expiração */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expira Em
        </label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Opcional: Data e hora em que a reserva expira automaticamente
        </p>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Observações adicionais"
        />
        <p className="mt-1 text-sm text-gray-500">
          Opcional: Informações adicionais sobre a reserva
        </p>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? 'Criando...' : 'Criar Reserva'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Erro de Submissão */}
      {createMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            {(createMutation.error as any)?.response?.data?.message ||
              'Erro ao criar reserva. Tente novamente.'}
          </p>
        </div>
      )}
    </form>
  );
}
