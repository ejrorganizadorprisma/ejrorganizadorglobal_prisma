import { useEffect, useState } from 'react';
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
  AlertTriangle,
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

/**
 * Estado por linha do pedido controlando se o item entra na fatura
 * e qual quantidade será faturada (default = qty original).
 * Indexado pelo id do item (ou pelo índice quando id ausente).
 */
type ItemSelectionState = {
  selected: boolean;
  quantity: number;
};

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

  // Seleção/quantidade parcial por item — keyed por id (ou índice como fallback)
  const [itemSelection, setItemSelection] = useState<Record<string, ItemSelectionState>>({});

  // Inicializa seleção quando o pedido carrega/muda — todos marcados, qty original
  useEffect(() => {
    if (!order?.items) return;
    const next: Record<string, ItemSelectionState> = {};
    order.items.forEach((item, idx) => {
      const key = item.id || `idx-${idx}`;
      next[key] = { selected: true, quantity: item.quantity };
    });
    setItemSelection(next);
  }, [order?.items]);

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

  // Helpers para acessar/atualizar seleção
  const getKey = (item: any, idx: number) => item.id || `idx-${idx}`;
  const getState = (item: any, idx: number): ItemSelectionState =>
    itemSelection[getKey(item, idx)] || { selected: true, quantity: item.quantity };

  const updateSelection = (key: string, patch: Partial<ItemSelectionState>) => {
    setItemSelection((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch } as ItemSelectionState,
    }));
  };

  // Cálculos baseados apenas nos itens marcados / com qty efetiva
  const selectedRows = items
    .map((item, idx) => ({ item, idx, state: getState(item, idx) }))
    .filter((r) => r.state.selected && r.state.quantity > 0);

  const subtotal = selectedRows.reduce((sum, r) => {
    const lineTotal = r.state.quantity * r.item.unitPrice - (r.item.discount || 0);
    return sum + Math.max(0, lineTotal);
  }, 0);

  // Detecta conversão parcial (item desmarcado ou qty < original)
  const isPartialConversion = items.some((item, idx) => {
    const st = getState(item, idx);
    return !st.selected || st.quantity < item.quantity;
  });

  // Desconto do pedido. Em faturamento PARCIAL, rateia proporcional ao subtotal
  // selecionado (senão o desconto cheio cairia sobre a parte E de novo no saldo).
  const fullSubtotal = items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitPrice - (item.discount || 0)), 0);
  const headerDiscount = discount || order.discount || 0;
  const orderDiscount = isPartialConversion && fullSubtotal > 0
    ? Math.round(headerDiscount * (subtotal / fullSubtotal))
    : headerDiscount;
  const finalTotal = Math.max(0, subtotal - orderDiscount + shippingCost);

  const hasAnySelected = selectedRows.length > 0;

  // Validação por item (qty>0 e <= original)
  const invalidQty = items.some((item, idx) => {
    const st = getState(item, idx);
    if (!st.selected) return false;
    return st.quantity <= 0 || st.quantity > item.quantity;
  });

  const handleConvert = async () => {
    if (!paymentMethod) {
      toast.error('Selecione o metodo de pagamento');
      return;
    }
    if (!hasAnySelected) {
      toast.error('Selecione ao menos um item para faturar');
      return;
    }
    if (invalidQty) {
      toast.error('Quantidade inválida em algum item');
      return;
    }

    // Monta lista de itens parciais — sempre enviamos (mesmo conversão total)
    // para que o backend trate uniformemente. Se for total, será igual ao original.
    const itemsPayload = selectedRows.map((r) => ({
      itemType: r.item.itemType,
      productId: r.item.productId,
      serviceName: r.item.serviceName,
      quantity: r.state.quantity,
      unitPrice: r.item.unitPrice,
      discount: r.item.discount || 0,
    }));

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
      items: itemsPayload,
    };

    try {
      await convertMutation.mutateAsync({ orderId: order.id, data: dto });
      toast.success(
        isPartialConversion
          ? 'Pedido faturado parcialmente! Venda criada com o subset selecionado.'
          : 'Pedido faturado com sucesso! Venda criada.'
      );
      // Após conversão, redireciona para o detalhe do pedido (PARTIALLY ou CONVERTED)
      navigate(`/sales-orders/${order.id}/edit`);
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
          {/* Items — com seleção/qty parcial */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Itens do Pedido</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Marque/desmarque e ajuste a quantidade para faturar parcialmente.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, ItemSelectionState> = {};
                    items.forEach((item, idx) => {
                      next[getKey(item, idx)] = { selected: true, quantity: item.quantity };
                    });
                    setItemSelection(next);
                  }}
                  className="px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, ItemSelectionState> = {};
                    items.forEach((item, idx) => {
                      next[getKey(item, idx)] = { selected: false, quantity: item.quantity };
                    });
                    setItemSelection(next);
                  }}
                  className="px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
            <div className="divide-y">
              {items.map((item, idx) => {
                const key = getKey(item, idx);
                const state = getState(item, idx);
                const lineTotal = state.selected
                  ? Math.max(0, state.quantity * item.unitPrice - (item.discount || 0))
                  : 0;
                const balance = item.quantity - state.quantity;
                const qtyOver = state.quantity > item.quantity;
                const qtyZeroOrLess = state.quantity <= 0;
                const isItemPartial = state.selected && state.quantity < item.quantity;

                return (
                  <div
                    key={key}
                    className={`px-6 py-3 flex items-start gap-3 ${
                      !state.selected ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onChange={(e) => updateSelection(key, { selected: e.target.checked })}
                      className="mt-2 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      aria-label="Incluir item nesta venda"
                    />
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
                      <p className="text-xs text-gray-500">
                        Original: {item.quantity}x {formatPrice(item.unitPrice)}
                        {item.discount > 0 && (
                          <span className="text-red-500 ml-2">-{formatPrice(item.discount)}</span>
                        )}
                      </p>
                      {state.selected && balance > 0 && (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Saldo: {balance} {balance === 1 ? 'unidade ficará' : 'unidades ficarão'} pendente
                          {balance === 1 ? '' : 's'}.
                        </p>
                      )}
                      {qtyOver && (
                        <p className="text-xs text-red-600 mt-0.5">
                          Quantidade não pode ser maior que {item.quantity}.
                        </p>
                      )}
                      {qtyZeroOrLess && state.selected && (
                        <p className="text-xs text-red-600 mt-0.5">
                          Quantidade deve ser maior que zero.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 min-w-[160px]">
                      <label className="text-[10px] uppercase tracking-wide text-gray-400">
                        Qty a faturar
                      </label>
                      <input
                        type="number"
                        min={item.itemType === 'SERVICE' ? 0 : 1}
                        max={item.quantity}
                        step={item.itemType === 'SERVICE' ? 'any' : 1}
                        value={state.quantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Para serviços permitimos valores fracionários
                          const parsed =
                            item.itemType === 'SERVICE'
                              ? parseFloat(raw) || 0
                              : parseInt(raw) || 0;
                          updateSelection(key, { quantity: parsed });
                        }}
                        disabled={!state.selected}
                        className={`w-24 px-2 py-1 border rounded text-sm text-right disabled:bg-gray-100 ${
                          qtyOver || (qtyZeroOrLess && state.selected)
                            ? 'border-red-400 focus:ring-red-500'
                            : 'border-gray-200 focus:ring-emerald-500'
                        }`}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          isItemPartial ? 'text-amber-700' : 'text-gray-900'
                        }`}
                      >
                        {formatPrice(lineTotal)}
                      </span>
                      {isItemPartial && (
                        <span className="text-[10px] text-amber-600">parcial</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-3 border-t bg-gray-50/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal (itens marcados)</span>
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

          {/* Aviso de conversão parcial */}
          {isPartialConversion && hasAnySelected && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Conversão parcial</p>
                <p>
                  Esta é uma conversão parcial. O saldo do pedido continuará disponível para
                  faturamento posterior.
                </p>
              </div>
            </div>
          )}

          {/* Aviso de nenhum item marcado */}
          {!hasAnySelected && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>Marque ao menos um item para faturar.</span>
            </div>
          )}

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
            disabled={convertMutation.isPending || !hasAnySelected || invalidQty}
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {convertMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRightCircle className="w-5 h-5" />
            )}
            {isPartialConversion ? 'Faturar parcialmente' : 'Faturar Pedido'}
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
