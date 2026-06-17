import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useSupplierOrder,
  useSendSupplierOrder,
  useConfirmSupplierOrder,
  useCancelSupplierOrder,
  useUpdateSupplierOrder,
} from '../hooks/useSupplierOrders';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useAuth } from '../hooks/useAuth';
import { useFormatPrice, formatPriceValue } from '../hooks/useFormatPrice';
import { toast } from 'sonner';
import { generateSupplierOrderPdf, type DocumentSettingsForPdf } from '../services/supplierOrderPdf';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  CONFIRMED: 'Confirmado',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const { data: order, isLoading } = useSupplierOrder(id);
  const { data: documentSettings } = useDefaultDocumentSettings();
  const sendOrder = useSendSupplierOrder();
  const confirmOrder = useConfirmSupplierOrder();
  const cancelOrder = useCancelSupplierOrder();
  const updateOrder = useUpdateSupplierOrder();

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const handleGeneratePdf = () => {
    if (order) {
      const pdfSettings: DocumentSettingsForPdf | undefined = documentSettings ? {
        companyLogo: documentSettings.companyLogo || undefined,
        companyName: documentSettings.companyName || undefined,
        footerText: documentSettings.footerText || undefined,
        footerAddress: documentSettings.footerAddress || undefined,
        footerPhone: documentSettings.footerPhone || undefined,
        footerEmail: documentSettings.footerEmail || undefined,
        footerWebsite: documentSettings.footerWebsite || undefined,
        primaryColor: documentSettings.primaryColor || undefined,
        secondaryColor: documentSettings.secondaryColor || undefined,
      } : undefined;
      generateSupplierOrderPdf(order, pdfSettings, defaultCurrency);
      toast.success('PDF gerado com sucesso!');
    }
  };

  const handleSend = async () => {
    if (window.confirm('Marcar este pedido como enviado ao fornecedor?')) {
      try {
        await sendOrder.mutateAsync(id!);
        toast.success('Pedido marcado como enviado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao enviar');
      }
    }
  };

  const handleConfirm = async () => {
    if (window.confirm('Confirmar recebimento deste pedido pelo fornecedor?')) {
      try {
        await confirmOrder.mutateAsync(id!);
        toast.success('Pedido confirmado pelo fornecedor!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao confirmar');
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await cancelOrder.mutateAsync(id!);
        toast.success('Pedido cancelado!');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
      }
    }
  };

  const handleStartEdit = () => {
    setNotes(order?.notes || '');
    setInternalNotes(order?.internalNotes || '');
    setPaymentTerms(order?.paymentTerms || '');
    setExpectedDeliveryDate(order?.expectedDeliveryDate?.split('T')[0] || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateOrder.mutateAsync({
        id: id!,
        data: {
          notes: notes || undefined,
          internalNotes: internalNotes || undefined,
          paymentTerms: paymentTerms || undefined,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
        },
      });
      toast.success('Pedido atualizado!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar');
    }
  };

  const { defaultCurrency } = useFormatPrice();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Pedido não encontrado</h2>
          <button
            onClick={() => navigate('/supplier-orders')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  // ==================== Multi-moeda (mesmo formato do orçamento) ====================
  const budget = (order as any).budget;
  const currency = (budget?.currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
  const symbolOf: Record<string, string> = { BRL: 'R$', USD: 'US$', PYG: '₲' };
  const currencySymbol = symbolOf[currency] || 'R$';
  const r1 = budget?.exchangeRate1 || 0; // 1 BRL = X PYG
  const r2 = budget?.exchangeRate2 || 0; // 1 USD = X PYG
  const r3 = budget?.exchangeRate3 || 0; // 1 USD = X BRL
  const hasRates = r1 > 0 && r2 > 0 && r3 > 0;
  const directRates = hasRates
    ? { BRL_PYG: r1, PYG_BRL: 1 / r1, USD_PYG: r2, PYG_USD: 1 / r2, USD_BRL: r3, BRL_USD: 1 / r3 }
    : null;
  const convertDirect = (amount: number, from: string, to: string): number => {
    if (from === to || !directRates) return amount;
    return amount * (directRates[`${from}_${to}` as keyof typeof directRates] as number);
  };
  const fmtCur = (amount: number, cur: string) => {
    if (cur === 'PYG') return formatPriceValue(Math.round(amount), 'PYG');
    if (cur === 'USD') return formatPriceValue(Math.round(amount * 100), 'USD');
    return formatPriceValue(Math.round(amount * 100), 'BRL');
  };
  // BRL cents → moeda principal (valor)
  const toPrimary = (centsBRL: number): number => {
    const amt = convertDirect(centsBRL / 100, 'BRL', currency);
    return currency === 'PYG' ? Math.round(amt) : Math.round(amt * 100) / 100;
  };
  // Exibe BRL cents na moeda principal
  const showPrice = (centsBRL: number) => fmtCur(toPrimary(centsBRL), currency);
  const otherCurrencies = (['BRL', 'USD', 'PYG'] as const).filter((c) => c !== currency);
  // As 2 outras moedas (a partir do valor já na moeda principal)
  const secondary = (centsBRL: number): string | null => {
    if (!hasRates) return null;
    const primary = toPrimary(centsBRL);
    return otherCurrencies.map((c) => fmtCur(convertDirect(primary, currency, c), c)).join(' · ');
  };

  // Custos adicionais (igual ao orçamento): subtotal × (1 + %)
  const additionalCosts = (budget?.additionalCosts || []) as any[];
  const totalAdditionalPct = additionalCosts.reduce((s, c) => s + (c?.percentage || 0), 0);
  const costMult = 1 + totalAdditionalPct / 100; // custos embutidos em todos os valores
  const subtotalCents = order.subtotal || 0;
  const totalWithCostsCents = Math.round(subtotalCents * costMult);
  // Valor (BRL cents) na moeda Guaraní (destaque) + R$/US$ abaixo
  const pygOf = (centsBRL: number): string => fmtCur(convertDirect(centsBRL / 100, 'BRL', 'PYG'), 'PYG');
  const brlUsdOf = (centsBRL: number): string | null => {
    if (!hasRates) return null;
    const brl = centsBRL / 100;
    return `${fmtCur(brl, 'BRL')} · ${fmtCur(convertDirect(brl, 'BRL', 'USD'), 'USD')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/supplier-orders')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &larr; Voltar
                </button>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  {budget ? `${budget.budgetNumber} - ${budget.title}` : `Pedido ${order.orderNumber}`}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Pedido {order.orderNumber}
                {budget && <span className="ml-2 text-gray-400">· Orçamento {budget.budgetNumber}</span>}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {order.status === 'PENDING' && !isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
              )}

              <button
                onClick={handleGeneratePdf}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Gerar PDF
              </button>

              {order.status === 'PENDING' && (
                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Marcar como Enviado
                </button>
              )}

              {order.status === 'SENT' && (
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirmar Recebimento
                </button>
              )}

              {(order.status === 'PENDING' || order.status === 'SENT') && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Cancelar
                </button>
              )}

              {['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status) && (
                <button
                  onClick={() => navigate(`/goods-receipts/new?supplierOrderId=${id}`)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Registrar Recebimento
                </button>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Fornecedor */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Fornecedor</h3>
              <p className="text-lg font-semibold text-gray-900">{order.supplier?.name || '-'}</p>
              {order.supplier?.document && (
                <p className="text-sm text-gray-500">{order.supplier.document}</p>
              )}
            </div>

            {/* Ordem de Compra */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ordem de Compra</h3>
              <p className="text-lg font-semibold text-gray-900">
                {order.purchaseOrder?.orderNumber || '-'}
              </p>
              {order.purchaseOrder?.name && (
                <p className="text-sm text-gray-500 truncate" title={order.purchaseOrder.name}>
                  {order.purchaseOrder.name}
                </p>
              )}
              <button
                onClick={() => navigate(`/purchase-orders/${order.purchaseOrderId}`)}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                Ver OC
              </button>
            </div>

            {/* Datas */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Datas</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Data do Pedido:</span>{' '}
                  <span className="font-medium">{formatDate(order.orderDate)}</span>
                </p>
                {order.expectedDeliveryDate && (
                  <p>
                    <span className="text-gray-500">Entrega Prevista:</span>{' '}
                    <span className="font-medium">{formatDate(order.expectedDeliveryDate)}</span>
                  </p>
                )}
                {order.sentAt && (
                  <p>
                    <span className="text-gray-500">Enviado em:</span>{' '}
                    <span className="font-medium">{formatDateTime(order.sentAt)}</span>
                  </p>
                )}
                {order.confirmedAt && (
                  <p>
                    <span className="text-gray-500">Confirmado em:</span>{' '}
                    <span className="font-medium">{formatDateTime(order.confirmedAt)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Previsão de Entrega
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ex: 30/60/90 dias"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (visível ao fornecedor)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações Internas
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateOrder.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateOrder.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Notes Display (when not editing) */}
          {!isEditing && (order.notes || order.internalNotes || order.paymentTerms) && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.paymentTerms && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Condições de Pagamento</h4>
                    <p className="text-gray-900">{order.paymentTerms}</p>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Observações</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
                {order.internalNotes && isAdmin && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Observações Internas</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{order.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table — mesmo formato do Orçamento de Compra */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Itens do Pedido</h3>
              <span className="text-xs text-gray-400">Valores em {currencySymbol} {currency}</span>
            </div>
            <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              {/* Cabeçalho */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b">
                <div className="col-span-3">Produto</div>
                <div className="col-span-1 text-center">Qtd</div>
                <div className="col-span-1 text-center">Receb.</div>
                <div className="col-span-1 text-center">Pend.</div>
                <div className="col-span-2 text-center">Preço Unit. {currencySymbol}</div>
                <div className="col-span-2 text-center" title="Preço unitário + custos adicionais, em Guaraní (com R$/US$ e o valor acrescido)">Unit. c/ custos ₲</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>
              {/* Itens */}
              <div className="divide-y divide-gray-100">
                {order.items?.map((item: any, idx: number) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-gray-50">
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name || '-'}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          {item.product?.code && <span>{item.product.code}</span>}
                          {item.product?.factoryCode && <span>· cód. fáb. {item.product.factoryCode}</span>}
                        </div>
                        {item.notes && <p className="text-[11px] text-amber-600 mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-sm font-bold">{item.quantity}</span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-sm font-bold">{item.quantityReceived}</span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-md text-sm font-bold ${item.quantityPending > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {item.quantityPending}
                      </span>
                    </div>
                    {/* Preço unitário SEM custos (igual ao "Preço Atual" do orçamento) */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-medium text-gray-900">{showPrice(item.unitPrice)}</span>
                    </div>
                    {/* Preço unitário COM custos adicionais: Guaraní (destaque) + R$/US$ abaixo + acréscimo em ₲.
                        Converte a partir do valor exato (sem arredondar centavos antes) p/ o câmbio fechar. */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-bold text-emerald-700">{pygOf(item.unitPrice * costMult)}</span>
                      {brlUsdOf(item.unitPrice * costMult) && (
                        <p className="text-[10px] text-gray-400">{brlUsdOf(item.unitPrice * costMult)}</p>
                      )}
                      {totalAdditionalPct > 0 && (
                        <p className="text-[9px] text-amber-600 leading-tight">
                          +{pygOf(item.unitPrice * (costMult - 1))} (+{totalAdditionalPct.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                    {/* Subtotal da linha SEM custos (qtd × preço unitário) */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold text-gray-900">{showPrice(item.totalPrice)}</span>
                      {secondary(item.totalPrice) && (
                        <p className="text-[10px] text-gray-400">{secondary(item.totalPrice)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Totais — mesmo formato do orçamento (subtotal em destaque + custos + total) */}
            <div className="border-t-2 border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'itens'}
                </span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    <span className="text-xs font-normal text-gray-400 mr-1">Total</span>
                    {showPrice(totalWithCostsCents)}
                  </div>
                  {secondary(totalWithCostsCents) && <p className="text-xs text-gray-500">{secondary(totalWithCostsCents)}</p>}
                  {totalAdditionalPct > 0 && (
                    <p className="text-[11px] text-amber-600 mt-0.5">Valores já incluem +{totalAdditionalPct.toFixed(1)}% de custos adicionais</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 text-sm text-gray-500">
            <p>
              Criado em: {formatDateTime(order.createdAt)}
              {order.updatedAt !== order.createdAt && (
                <> | Atualizado em: {formatDateTime(order.updatedAt)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
