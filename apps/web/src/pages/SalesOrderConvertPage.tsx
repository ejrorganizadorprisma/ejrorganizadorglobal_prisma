import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSalesOrder, useConvertOrderToSale, type ConvertToSaleFromOrderDTO } from '../hooks/useSalesOrders';
import { useFormatPrice } from '../hooks/useFormatPrice';
import {
  ArrowLeft,
  ArrowRightCircle,
  Package,
  Wrench,
  Truck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartao Credito' },
  { value: 'DEBIT_CARD', label: 'Cartao Debito' },
  { value: 'BANK_SLIP', label: 'Boleto' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'CREDIT', label: 'A Prazo (Fiado)' },
];

const SHIPPING_METHODS = [
  { value: '', label: 'Sem frete' },
  { value: 'PICKUP', label: 'Retirada' },
  { value: 'DELIVERY', label: 'Entrega propria' },
  { value: 'CARRIER', label: 'Transportadora' },
  { value: 'POSTAL', label: 'Correios' },
];

export function SalesOrderConvertPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useSalesOrder(id!, { enabled: !!id });
  const convertMutation = useConvertOrderToSale();
  const { formatPrice } = useFormatPrice();

  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [installments, setInstallments] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [carrierName, setCarrierName] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Pedido nao encontrado</p>
      </div>
    );
  }

  const items = order.items || [];
  const orderDiscount = discount || order.discount || 0;
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const finalTotal = subtotal - orderDiscount + shippingCost;

  const handleConvert = async () => {
    if (!paymentMethod) {
      toast.error('Selecione o metodo de pagamento');
      return;
    }

    const dto: ConvertToSaleFromOrderDTO = {
      paymentMethod,
      saleDate: new Date().toISOString(),
      dueDate: dueDate || undefined,
      installments,
      discount: orderDiscount,
      notes: notes || undefined,
      shippingMethod: shippingMethod || undefined,
      shippingCost: shippingCost || undefined,
      carrierName: carrierName || undefined,
      shippingNotes: shippingNotes || undefined,
    };

    try {
      await convertMutation.mutateAsync({ orderId: order.id, data: dto });
      toast.success('Pedido faturado com sucesso! Venda criada.');
      navigate('/sales-orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error?.message || 'Erro ao faturar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/sales-orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Faturar Pedido {order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {order.customer?.name} &bull; Vendedor: {order.seller?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Itens do pedido */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Itens do Pedido</h2>
            </div>
            <div className="divide-y">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="px-6 py-3 flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {item.itemType === 'PRODUCT' ? (
                      <Package className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Wrench className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.product?.name || item.serviceName || '-'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity}x {formatPrice(item.unitPrice)}
                      {item.discount > 0 && (
                        <span className="text-red-500 ml-2">-{formatPrice(item.discount)}</span>
                      )}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t bg-gray-50/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {orderDiscount > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-red-500">Desconto</span>
                  <span className="text-red-500">-{formatPrice(orderDiscount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Frete</span>
                  <span className="font-medium">+{formatPrice(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                <span>Total</span>
                <span className="text-indigo-600">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Frete / Logistica</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de envio</label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {SHIPPING_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo do frete (centavos)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {shippingMethod === 'CARRIER' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora</label>
                  <input
                    type="text"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="Nome da transportadora"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes de envio</label>
                <input
                  type="text"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="Observacoes sobre entrega..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Dados financeiros */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Dados Financeiros</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pagamento *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (centavos)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder={order.discount ? String(order.discount) : '0'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observacoes sobre a venda..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Convert button */}
          <button
            onClick={handleConvert}
            disabled={convertMutation.isPending}
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm disabled:opacity-50"
          >
            {convertMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRightCircle className="w-5 h-5" />
            )}
            Faturar Pedido
          </button>

          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-700 mb-1">Notas do pedido</p>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
