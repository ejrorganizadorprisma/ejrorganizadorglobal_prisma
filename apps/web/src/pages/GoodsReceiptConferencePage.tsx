import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrder } from '../hooks/usePurchaseOrders';
import { useCreateGoodsReceipt, useApproveGoodsReceipt } from '../hooks/useGoodsReceipts';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle, AlertTriangle, XCircle,
  Package, FileText, ChevronDown, ChevronUp, ClipboardCheck,
} from 'lucide-react';

type ConferenceStatus = 'CONFORME' | 'DIVERGENCIA' | 'REJEITADO';

interface ConferenceItem {
  purchaseOrderItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantityOrdered: number;
  quantityAlreadyReceived: number;
  quantityPending: number;
  quantityReceived: number;
  unitPrice: number;
  status: ConferenceStatus;
  notes: string;
}

export function GoodsReceiptConferencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice: formatCurrency } = useFormatPrice();

  const { data: purchaseOrder, isLoading } = usePurchaseOrder(id);
  const createReceipt = useCreateGoodsReceipt();
  const approveReceipt = useApproveGoodsReceipt();

  const [conferenceItems, setConferenceItems] = useState<ConferenceItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (purchaseOrder?.items && purchaseOrder.items.length > 0) {
      setConferenceItems(purchaseOrder.items.map((item: any) => {
        const alreadyReceived = item.quantityReceived || 0;
        const pending = Math.max(0, item.quantity - alreadyReceived);
        return {
          purchaseOrderItemId: item.id,
          productId: item.productId,
          productCode: item.product?.code || '',
          productName: item.product?.name || item.productName || '',
          quantityOrdered: item.quantity,
          quantityAlreadyReceived: alreadyReceived,
          quantityPending: pending,
          quantityReceived: pending,
          unitPrice: item.unitPrice,
          status: 'CONFORME' as ConferenceStatus,
          notes: '',
        };
      }));
    }
  }, [purchaseOrder]);

  const summary = useMemo(() => {
    const conformes = conferenceItems.filter(i => i.status === 'CONFORME').length;
    const divergentes = conferenceItems.filter(i => i.status === 'DIVERGENCIA').length;
    const rejeitados = conferenceItems.filter(i => i.status === 'REJEITADO').length;
    const totalReceived = conferenceItems.reduce((sum, i) => sum + (i.status !== 'REJEITADO' ? i.quantityReceived * i.unitPrice : 0), 0);
    return { total: conferenceItems.length, conformes, divergentes, rejeitados, totalReceived };
  }, [conferenceItems]);

  const updateItem = (index: number, field: keyof ConferenceItem, value: any) => {
    setConferenceItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };

      if (field === 'quantityReceived') {
        const qty = Number(value) || 0;
        if (qty !== item.quantityPending && updated.status === 'CONFORME') {
          updated.status = 'DIVERGENCIA';
        } else if (qty === item.quantityPending && updated.status === 'DIVERGENCIA' && !updated.notes) {
          updated.status = 'CONFORME';
        }
      }

      if (field === 'status' && value === 'CONFORME') {
        updated.notes = '';
        updated.quantityReceived = item.quantityPending;
      }
      if (field === 'status' && value === 'REJEITADO') {
        updated.quantityReceived = 0;
      }

      return updated;
    }));
  };

  const handleConfirmReceipt = async () => {
    if (!purchaseOrder) return;

    const hasReceivedItems = conferenceItems.some(i => i.quantityReceived > 0 && i.status !== 'REJEITADO');
    if (!hasReceivedItems) {
      toast.error('Pelo menos um item deve ser recebido.');
      return;
    }

    const divergent = conferenceItems.filter(i => i.status === 'DIVERGENCIA' && !i.notes);
    if (divergent.length > 0) {
      toast.error('Preencha as observações dos itens com divergência.');
      return;
    }

    if (!window.confirm('Confirmar o recebimento? O estoque será atualizado automaticamente.')) return;

    setIsSubmitting(true);
    try {
      const payload = {
        purchaseOrderId: purchaseOrder.id,
        supplierId: purchaseOrder.supplierId,
        receiptDate,
        invoiceNumber: invoiceNumber || undefined,
        invoiceDate: invoiceDate || undefined,
        invoiceAmount: invoiceAmount ? Math.round(parseFloat(invoiceAmount) * 100) : undefined,
        notes: generalNotes || undefined,
        items: conferenceItems.map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          quantityOrdered: item.quantityPending,
          quantityReceived: item.status === 'REJEITADO' ? 0 : item.quantityReceived,
          unitPrice: item.unitPrice,
          notes: item.notes || undefined,
        })),
      };

      const receipt = await createReceipt.mutateAsync(payload);
      await approveReceipt.mutateAsync(receipt.id);

      toast.success('Recebimento confirmado! Estoque atualizado.');
      navigate(-1);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.error || 'Erro ao confirmar recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePending = async () => {
    if (!purchaseOrder) return;

    setIsSubmitting(true);
    try {
      const payload = {
        purchaseOrderId: purchaseOrder.id,
        supplierId: purchaseOrder.supplierId,
        receiptDate,
        invoiceNumber: invoiceNumber || undefined,
        invoiceDate: invoiceDate || undefined,
        invoiceAmount: invoiceAmount ? Math.round(parseFloat(invoiceAmount) * 100) : undefined,
        notes: generalNotes || undefined,
        items: conferenceItems.map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          quantityOrdered: item.quantityPending,
          quantityReceived: item.quantityReceived,
          unitPrice: item.unitPrice,
          notes: item.notes || undefined,
        })),
      };

      await createReceipt.mutateAsync(payload);
      toast.success('Recebimento salvo como pendente.');
      navigate('/goods-receipts');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAllConforme = () => {
    setConferenceItems(prev => prev.map(item => ({
      ...item,
      quantityReceived: item.quantityPending,
      status: 'CONFORME' as ConferenceStatus,
      notes: '',
    })));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Pedido de compra não encontrado.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  const hasPartialReceipt = conferenceItems.some(i => i.quantityAlreadyReceived > 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Conferência de Recebimento</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Pedido <span className="font-mono font-medium">{purchaseOrder.orderNumber}</span>
              {purchaseOrder.supplier && <> — {purchaseOrder.supplier.name}</>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total do pedido</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(purchaseOrder.totalAmount)}</p>
        </div>
      </div>

      {/* ===== DATA RECEBIMENTO ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Data do recebimento:</label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={markAllConforme}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
        >
          <CheckCircle className="w-4 h-4" />
          Marcar todos conforme
        </button>
      </div>

      {/* ===== NF / INVOICE (colapsável) ===== */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <button
          onClick={() => setShowInvoice(!showInvoice)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Nota Fiscal / Recibo</span>
            {invoiceNumber && !showInvoice && (
              <span className="text-xs text-gray-400">— NF {invoiceNumber}</span>
            )}
          </div>
          {showInvoice ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showInvoice && (
          <div className="px-4 pb-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Número NF</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Ex: 001234"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data NF</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor NF (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <input
                  type="text"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Obs. gerais..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== TABELA DE CONFERÊNCIA ===== */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
        {/* Header da tabela */}
        <div className={`grid gap-2 px-4 py-2.5 text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b min-w-[700px] ${hasPartialReceipt ? 'grid-cols-12' : 'grid-cols-11'}`}>
          <div className="col-span-4">Produto</div>
          <div className="col-span-1 text-center">Pedido</div>
          {hasPartialReceipt && <div className="col-span-1 text-center">Recebido</div>}
          <div className="col-span-1 text-center">Receber</div>
          <div className="col-span-2 text-center">Conferência</div>
          <div className="col-span-1 text-right">Unit.</div>
          <div className="col-span-1 text-right">Subtotal</div>
          <div className="col-span-1"></div>
        </div>

        {/* Itens */}
        <div className="divide-y divide-gray-100 min-w-[700px]">
          {conferenceItems.map((item, index) => {
            const subtotal = item.status !== 'REJEITADO' ? item.quantityReceived * item.unitPrice : 0;
            const rowBg = item.status === 'CONFORME' ? 'bg-green-50/40' : item.status === 'DIVERGENCIA' ? 'bg-yellow-50/60' : 'bg-red-50/40';

            return (
              <div key={item.purchaseOrderItemId}>
                <div className={`grid gap-2 px-4 py-3 items-center ${hasPartialReceipt ? 'grid-cols-12' : 'grid-cols-11'} ${rowBg}`}>
                  {/* Produto */}
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    {item.productCode && (
                      <p className="text-xs text-gray-400 font-mono">{item.productCode}</p>
                    )}
                  </div>

                  {/* Qtd Pedida */}
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-medium text-gray-600">{item.quantityOrdered}</span>
                  </div>

                  {/* Qtd Já Recebida (se parcial) */}
                  {hasPartialReceipt && (
                    <div className="col-span-1 text-center">
                      <span className="text-sm text-blue-600 font-medium">{item.quantityAlreadyReceived}</span>
                    </div>
                  )}

                  {/* Qtd Receber */}
                  <div className="col-span-1 text-center">
                    <input
                      type="number"
                      min={0}
                      value={item.quantityReceived}
                      onChange={(e) => updateItem(index, 'quantityReceived', parseInt(e.target.value) || 0)}
                      disabled={item.status === 'REJEITADO'}
                      className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center font-medium ${
                        item.status === 'REJEITADO' ? 'bg-gray-100 text-gray-400' :
                        item.quantityReceived !== item.quantityPending ? 'border-yellow-400 text-yellow-700' :
                        'border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Status buttons */}
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateItem(index, 'status', 'CONFORME')}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.status === 'CONFORME'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                      }`}
                      title="Conforme"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateItem(index, 'status', 'DIVERGENCIA')}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.status === 'DIVERGENCIA'
                          ? 'bg-yellow-500 text-white shadow-sm'
                          : 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                      }`}
                      title="Divergência"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateItem(index, 'status', 'REJEITADO')}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.status === 'REJEITADO'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                      title="Rejeitado"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preço unitário */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm text-gray-600">{formatCurrency(item.unitPrice)}</span>
                  </div>

                  {/* Subtotal */}
                  <div className="col-span-1 text-right">
                    <span className={`text-sm font-semibold ${item.status === 'REJEITADO' ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {/* Expand indicator (for notes) */}
                  <div className="col-span-1 text-center">
                    {item.status !== 'CONFORME' && (
                      <span className="text-xs text-gray-400">
                        {item.notes ? '...' : '!'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes row - visible when not CONFORME */}
                {item.status !== 'CONFORME' && (
                  <div className={`px-4 pb-3 ${rowBg}`}>
                    <div className="ml-4">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        placeholder={item.status === 'REJEITADO' ? 'Motivo da rejeição...' : 'Descreva a divergência...'}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* ===== RESUMO ===== */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{summary.total} itens</span>
              <div className="flex items-center gap-3">
                {summary.conformes > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                    <CheckCircle className="w-3 h-3" /> {summary.conformes} conforme{summary.conformes !== 1 && 's'}
                  </span>
                )}
                {summary.divergentes > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> {summary.divergentes} divergência{summary.divergentes !== 1 && 's'}
                  </span>
                )}
                {summary.rejeitados > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-red-100 text-red-700 rounded-full">
                    <XCircle className="w-3 h-3" /> {summary.rejeitados} rejeitado{summary.rejeitados !== 1 && 's'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-medium">Total recebido</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalReceived)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== AÇÕES ===== */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          Voltar
        </button>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleSavePending}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            Salvar Pendente
          </button>
          <button
            onClick={handleConfirmReceipt}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            {isSubmitting ? 'Processando...' : 'Confirmar Recebimento'}
          </button>
        </div>
      </div>
    </div>
  );
}
