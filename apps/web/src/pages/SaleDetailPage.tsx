import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  User,
  Calendar,
  Package,
  Wrench,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShoppingBag,
  FileText,
  TrendingUp,
  Banknote,
  Smartphone,
  Building,
  Receipt,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSale, useUpdateSale, useUpdatePayment } from '../hooks/useSales';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { generateSalePDF } from '../utils/salePdfGenerator';
import { SaleStatus, PaymentStatus } from '@ejr/shared-types';

const statusConfig: Record<SaleStatus, { label: string; bg: string; text: string; icon: any }> = {
  PENDING: { label: 'Pendente', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
  PAID: { label: 'Pago', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
  PARTIAL: { label: 'Parcial', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: TrendingUp },
  OVERDUE: { label: 'Atrasado', bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelado', bg: 'bg-gray-100 border-gray-200', text: 'text-gray-500', icon: XCircle },
};

const paymentMethodConfig: Record<string, { label: string; icon: any }> = {
  CASH: { label: 'Dinheiro', icon: Banknote },
  CREDIT_CARD: { label: 'Cartao de Credito', icon: CreditCard },
  DEBIT_CARD: { label: 'Cartao de Debito', icon: CreditCard },
  BANK_TRANSFER: { label: 'Transferencia', icon: Building },
  PIX: { label: 'PIX', icon: Smartphone },
  CHECK: { label: 'Cheque', icon: Receipt },
  PROMISSORY: { label: 'Promissoria', icon: Receipt },
  BOLETO: { label: 'Boleto', icon: Receipt },
  OTHER: { label: 'Outro', icon: CreditCard },
};

export function SaleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: sale, isLoading } = useSale(id!);
  const updateSale = useUpdateSale();
  const updatePayment = useUpdatePayment();
  const { formatPrice, defaultCurrency } = useFormatPrice();
  const { data: documentSettings } = useDefaultDocumentSettings();

  const handleGeneratePDF = (mode: 'elegant' | 'print') => {
    if (!sale) return;
    if (!sale.customer) {
      toast.error('Dados do cliente nao disponiveis');
      return;
    }
    try {
      generateSalePDF(sale as any, sale.customer as any, documentSettings, defaultCurrency, mode);
      toast.success(mode === 'print' ? 'PDF para impressao gerado' : 'PDF elegante gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'desconhecido'));
    }
  };

  const handleMarkPaymentAsPaid = async (paymentId: string) => {
    if (!id) return;
    if (!confirm('Marcar este pagamento como pago?')) return;

    try {
      await updatePayment.mutateAsync({
        saleId: id,
        paymentId,
        data: {
          status: PaymentStatus.PAID,
          paidDate: new Date().toISOString().split('T')[0],
        },
      });
      toast.success('Pagamento confirmado!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar pagamento');
    }
  };

  const handleCancelSale = async () => {
    if (!id) return;
    if (!confirm('Deseja cancelar esta venda? Esta acao nao pode ser desfeita.')) return;

    try {
      await updateSale.mutateAsync({
        id,
        data: { status: SaleStatus.CANCELLED },
      });
      toast.success('Venda cancelada');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar venda');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando venda...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <ShoppingBag className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">Venda nao encontrada</p>
        <button
          onClick={() => navigate('/sales')}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Voltar para vendas
        </button>
      </div>
    );
  }

  const cfg = statusConfig[sale.status];
  const StatusIcon = cfg?.icon;
  const paidPercent = sale.total > 0 ? Math.round((sale.totalPaid / sale.total) * 100) : 0;
  const pendingPayments = sale.payments?.filter((p) => p.status === 'PENDING') || [];
  const paidPayments = sale.payments?.filter((p) => p.status === 'PAID') || [];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar para Vendas
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sale.saleNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${cfg?.bg} ${cfg?.text}`}>
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {cfg?.label}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleGeneratePDF('elegant')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-200 transition-colors"
              title="Versao colorida com logo e cores da empresa"
            >
              <FileText className="w-4 h-4" />
              PDF Elegante
            </button>
            <button
              onClick={() => handleGeneratePDF('print')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-gray-300 transition-colors"
              title="Versao em escala de cinza, otimizada para economia de tinta"
            >
              <Printer className="w-4 h-4" />
              PDF Impressao
            </button>
            {sale.status !== 'CANCELLED' && sale.status !== 'PAID' && (
              <button
                onClick={handleCancelSale}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-200 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Venda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Progress Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Progresso do Pagamento</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(sale.totalPaid)}</span>
              <span className="text-gray-400">de {formatPrice(sale.total)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-blue-600">{paidPercent}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              paidPercent >= 100
                ? 'bg-emerald-500'
                : paidPercent > 0
                ? 'bg-blue-500'
                : 'bg-gray-200'
            }`}
            style={{ width: `${Math.min(paidPercent, 100)}%` }}
          />
        </div>

        {sale.totalPending > 0 && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-emerald-600 font-medium">
              Recebido: {formatPrice(sale.totalPaid)}
            </span>
            <span className="text-red-600 font-medium">
              Pendente: {formatPrice(sale.totalPending)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Payments - Most important action */}
          {pendingPayments.length > 0 && sale.status !== 'CANCELLED' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <h2 className="font-semibold text-amber-800 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pagamentos Pendentes ({pendingPayments.length})
                </h2>
              </div>
              <div className="divide-y">
                {pendingPayments.map((payment) => {
                  const pmConfig = paymentMethodConfig[payment.paymentMethod];
                  const PmIcon = pmConfig?.icon || CreditCard;
                  const isOverdue = new Date(payment.dueDate) < new Date();

                  return (
                    <div key={payment.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <PmIcon className={`w-5 h-5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Parcela {payment.installmentNumber}/{sale.installments}
                            </span>
                            {isOverdue && (
                              <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                                Atrasado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                            <span>{pmConfig?.label}</span>
                            <span>-</span>
                            <span>Venc: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-lg font-bold text-gray-900">{formatPrice(payment.amount)}</span>
                        <button
                          onClick={() => handleMarkPaymentAsPaid(payment.id)}
                          disabled={updatePayment.isPending}
                          className="ml-auto sm:ml-0 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                Itens da Venda ({sale.items?.length || 0})
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unitario</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Desc.</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sale.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {item.itemType === 'PRODUCT' ? (
                            <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <Wrench className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {item.itemType === 'PRODUCT' ? item.product?.name : item.serviceName}
                            </p>
                            {item.itemType === 'PRODUCT' && item.product?.code && (
                              <p className="text-xs text-gray-400">{item.product.code}</p>
                            )}
                            {item.itemType === 'SERVICE' && item.serviceDescription && (
                              <p className="text-xs text-gray-400">{item.serviceDescription}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-sm">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">{formatPrice(item.unitPrice)}</td>
                      <td className="px-5 py-3 text-right text-sm text-red-500">
                        {item.discount > 0 ? `-${formatPrice(item.discount)}` : '-'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-sm">{formatPrice(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y">
              {sale.items?.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {item.itemType === 'PRODUCT' ? (
                        <Package className="w-4 h-4 text-blue-500 mt-0.5" />
                      ) : (
                        <Wrench className="w-4 h-4 text-purple-500 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {item.itemType === 'PRODUCT' ? item.product?.name : item.serviceName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.quantity}x {formatPrice(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">{formatPrice(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paid Payments History */}
          {paidPayments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-5 py-3 border-b">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Pagamentos Realizados ({paidPayments.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {paidPayments.map((payment) => {
                  const pmConfig = paymentMethodConfig[payment.paymentMethod];
                  return (
                    <div key={payment.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            Parcela {payment.installmentNumber}/{sale.installments}
                          </span>
                          <p className="text-xs text-gray-400">
                            {pmConfig?.label} - Pago em {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-600 text-sm">{formatPrice(payment.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {(sale.notes || sale.internalNotes) && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-400" />
                Observacoes
              </h2>
              {sale.notes && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Cliente</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{sale.notes}</p>
                </div>
              )}
              {sale.internalNotes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Internas</p>
                  <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-3">{sale.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Summary sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              Cliente
            </h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">{sale.customer?.name}</p>
              {sale.customer?.document && (
                <p className="text-sm text-gray-500">{sale.customer.document}</p>
              )}
              {sale.customer?.email && (
                <p className="text-sm text-gray-500">{sale.customer.email}</p>
              )}
              {sale.customer?.phone && (
                <p className="text-sm text-gray-500">{sale.customer.phone}</p>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-400" />
              Resumo Financeiro
            </h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="text-red-600">-{formatPrice(sale.discount)}</span>
                </div>
              )}
              <div className="border-t pt-2.5 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg">{formatPrice(sale.total)}</span>
              </div>
              <div className="border-t pt-2.5 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Pago</span>
                  <span className="font-semibold text-emerald-600">{formatPrice(sale.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Pendente</span>
                  <span className="font-semibold text-red-600">{formatPrice(sale.totalPending)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sale Info */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              Informacoes
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Data da venda</span>
                <span className="font-medium">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</span>
              </div>
              {sale.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Vencimento</span>
                  <span className="font-medium">{new Date(sale.dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Parcelas</span>
                <span className="font-medium">{sale.installments}x</span>
              </div>
              {sale.createdByUser && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Criado por</span>
                  <span className="font-medium">{sale.createdByUser.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Criado em</span>
                <span className="font-medium">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {sale.quoteId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Origem</span>
                  <span className="font-medium text-blue-600">Orcamento</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
