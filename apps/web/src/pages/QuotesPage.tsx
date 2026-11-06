import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, useDeleteQuote } from '../hooks/useQuotes';
import { useConvertToSale } from '../hooks/useSales';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { api } from '../lib/api';
import { generateQuotePDF, type QuotePdfMode } from '../utils/quotePdfGenerator';
import { toast } from 'sonner';
import type { Currency, PaymentMethod } from '@ejr/shared-types';
import {
  FileText,
  Plus,
  Pencil,
  Sparkles,
  Trash2,
  Filter,
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  ArrowRight,
  CreditCard,
  DollarSign,
  Package,
  Wrench,
  Printer,
} from 'lucide-react';

const LOCALE_MAP: Record<string, string> = {
  BRL: 'pt-BR',
  PYG: 'es-PY',
  USD: 'en-US',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Rascunho',
    className: 'bg-gray-100 text-gray-700 border border-gray-300',
  },
  SENT: {
    label: 'Enviado',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  APPROVED: {
    label: 'Aprovado',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  REJECTED: {
    label: 'Rejeitado',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  EXPIRED: {
    label: 'Expirado',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-300',
  },
  CONVERTED: {
    label: 'Convertido',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX' as PaymentMethod, label: 'PIX' },
  { value: 'CASH' as PaymentMethod, label: 'Dinheiro' },
  { value: 'CREDIT' as PaymentMethod, label: 'Crédito' },
  { value: 'CREDIT_CARD' as PaymentMethod, label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD' as PaymentMethod, label: 'Cartão de Débito' },
  { value: 'BANK_TRANSFER' as PaymentMethod, label: 'Transferência' },
  { value: 'CHECK' as PaymentMethod, label: 'Cheque' },
  { value: 'PROMISSORY' as PaymentMethod, label: 'Promissória' },
  { value: 'BOLETO' as PaymentMethod, label: 'Boleto' },
  { value: 'OTHER' as PaymentMethod, label: 'Outro' },
];

// ===== CONVERSION MODAL =====
function ConvertToSaleModal({
  quote,
  onClose,
  onConfirm,
  isSubmitting,
  formatPrice,
  formatDate,
}: {
  quote: any;
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: string;
    installments: number;
    saleDate: string;
    dueDate: string;
    notes: string;
  }) => void;
  isSubmitting: boolean;
  formatPrice: (v: number) => string;
  formatDate: (s: string) => string;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [installments, setInstallments] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const installmentAmount = useMemo(() => {
    if (!quote || installments < 1) return 0;
    return Math.floor(quote.total / installments);
  }, [quote, installments]);

  const remainder = useMemo(() => {
    if (!quote || installments < 1) return 0;
    return quote.total - installmentAmount * installments;
  }, [quote, installments, installmentAmount]);

  const installmentsList = useMemo(() => {
    if (!quote || installments < 1) return [];
    const baseDate = dueDate ? new Date(dueDate) : new Date(saleDate);
    return Array.from({ length: installments }, (_, i) => {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i);
      let amount = installmentAmount;
      if (i === 0) amount += remainder;
      return {
        number: i + 1,
        amount,
        dueDate: date.toISOString().split('T')[0],
      };
    });
  }, [installments, installmentAmount, remainder, dueDate, saleDate, quote]);

  if (!quote) return null;

  const items = quote.items || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <ShoppingCart className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Converter em Venda</h2>
              <p className="text-green-100 text-sm">{quote.quote_number || quote.quoteNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Resumo do orcamento */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumo do Orcamento</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Cliente</span>
                <p className="font-medium text-gray-900">{quote.customer?.name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Validade</span>
                <p className="font-medium text-gray-900">{formatDate(quote.valid_until || quote.validUntil)}</p>
              </div>
            </div>

            {/* Items summary */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="space-y-1.5">
                {items.slice(0, 5).map((item: any, idx: number) => {
                  const name = item.product?.name || item.product_name || item.service_name || item.serviceName || '-';
                  const isService = (item.item_type || item.itemType) === 'SERVICE';
                  const qty = item.quantity;
                  const total = item.total || (qty * (item.unit_price || item.unitPrice));
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {isService ? (
                          <Wrench className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="text-gray-700 truncate">{qty}x {name}</span>
                      </div>
                      <span className="text-gray-900 font-medium ml-2 flex-shrink-0">{formatPrice(total)}</span>
                    </div>
                  );
                })}
                {items.length > 5 && (
                  <p className="text-xs text-gray-400">+ {items.length - 5} itens</p>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto</span>
                  <span className="text-red-600 font-medium">-{formatPrice(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-700 font-semibold">Total</span>
                <span className="text-lg font-bold text-green-700">{formatPrice(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Configuracao de pagamento */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={installments}
                  onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vencimento {installments > 1 ? '(1a Parcela)' : ''}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Parcelas preview */}
          {installments > 1 && (
            <div className="bg-blue-50/60 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
                {installments}x parcelas
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {installmentsList.map((inst) => (
                  <div key={inst.number} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">
                      {inst.number}a parcela
                      <span className="text-blue-500 ml-1.5 text-xs">
                        {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                    <span className="font-medium text-blue-900">{formatPrice(inst.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observacoes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Observacoes da venda..."
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>O estoque dos produtos sera atualizado automaticamente ao confirmar.</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg
                         hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm({ paymentMethod, installments, saleDate, dueDate, notes })}
              disabled={isSubmitting}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px]
                         bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold
                         transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Confirmar Venda
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
/** Posição do menu flutuante a partir do botão (abre para cima perto do fim da tela). */
function menuPosFrom(el: HTMLElement, menuHeight = 110) {
  const r = el.getBoundingClientRect();
  const up = r.bottom + menuHeight + 8 > window.innerHeight;
  return { top: up ? Math.max(8, r.top - menuHeight - 4) : r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) };
}

export function QuotesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<any>('');
  const [pdfMenuOpen, setPdfMenuOpen] = useState<string | null>(null);
  const [pdfMenuPos, setPdfMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<any>(null);
  const limit = 10;

  const { data, isLoading } = useQuotes({
    page,
    limit,
    search: search || undefined,
    status: status || undefined,
  });

  const deleteQuote = useDeleteQuote();
  const convertToSale = useConvertToSale();

  // System settings for currency
  const { data: systemSettings } = useSystemSettings();
  const defaultCurrency: Currency = systemSettings?.defaultCurrency || 'BRL';
  const { formatPrice } = useFormatPrice();
  const { data: documentSettings } = useDefaultDocumentSettings();

  const handleDelete = async (id: string, number: string) => {
    if (window.confirm(`Excluir orcamento ${number}?`)) {
      try {
        await deleteQuote.mutateAsync(id);
        toast.success('Orcamento excluido com sucesso');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Erro ao excluir orcamento');
      }
    }
  };

  const handleOpenConvertModal = (quote: any) => {
    setConvertingQuote(quote);
  };

  const handleConfirmConversion = async (data: {
    paymentMethod: string;
    installments: number;
    saleDate: string;
    dueDate: string;
    notes: string;
  }) => {
    if (!convertingQuote) return;

    try {
      const result = await convertToSale.mutateAsync({
        quoteId: convertingQuote.id,
        paymentMethod: data.paymentMethod,
        installments: data.installments,
        saleDate: data.saleDate,
        dueDate: data.dueDate || undefined,
        notes: data.notes || undefined,
      });

      toast.success('Orcamento convertido em venda com sucesso!');
      setConvertingQuote(null);

      // Navigate to the created sale
      if (result?.id) {
        navigate(`/sales/${result.id}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error?.message || 'Erro ao converter orcamento em venda';
      toast.error(message);
    }
  };

  const handleGeneratePdf = async (quoteId: string, mode: QuotePdfMode) => {
    setPdfMenuOpen(null);
    setPdfLoadingId(quoteId);
    try {
      const { data: quoteResp } = await api.get(`/quotes/${quoteId}`);
      const fullQuote = quoteResp.data;
      if (!fullQuote?.customer) {
        toast.error('Dados do cliente nao disponiveis');
        return;
      }
      const signerInfo = {
        name: documentSettings?.signatureName || 'Responsavel',
        role: documentSettings?.signatureRole || 'Diretor',
      };
      generateQuotePDF(fullQuote, fullQuote.customer, signerInfo, documentSettings, defaultCurrency, mode);
      toast.success(mode === 'print' ? 'PDF para impressao gerado' : 'PDF elegante gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.response?.data?.message || err?.message || 'desconhecido'));
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const locale = LOCALE_MAP[defaultCurrency] || 'pt-BR';
      return date.toLocaleDateString(locale);
    } catch {
      return '-';
    }
  };

  const isExpired = (dateString: string) => {
    try {
      return new Date(dateString) < new Date();
    } catch {
      return false;
    }
  };

  const getStatusBadge = (quoteStatus: string) => {
    const config = STATUS_CONFIG[quoteStatus] || STATUS_CONFIG.DRAFT;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const quotes = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-500 text-sm">Carregando orcamentos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Orcamentos</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Gerencie seus orcamentos e propostas
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/quotes/new')}
          className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     transition-colors flex items-center justify-center gap-1.5 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Orcamento</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por numero do orcamento..."
                aria-label="Buscar"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           text-sm transition-colors"
              />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="hidden sm:block w-4 h-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Status"
              className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         text-sm bg-white transition-colors"
            >
              <option value="">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="SENT">Enviado</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Rejeitado</option>
              <option value="EXPIRED">Expirado</option>
              <option value="CONVERTED">Convertido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table — compacta, 1 linha por orçamento */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed text-[13px]">
            <colgroup>
              <col className="w-[150px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[112px]" />
              <col className="hidden xl:table-column w-[110px]" />
              <col className="w-[176px]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Numero</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="hidden xl:table-cell px-3 py-2 text-left">Validade</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.length > 0 ? (
                quotes.map((quote: any) => {
                  const expired = quote.status !== 'EXPIRED'
                    && quote.status !== 'CONVERTED'
                    && quote.status !== 'APPROVED'
                    && quote.status !== 'REJECTED'
                    && isExpired(quote.valid_until);
                  return (
                    <tr key={quote.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-semibold text-gray-900 whitespace-nowrap tabular-nums"
                            title={`Validade: ${formatDate(quote.valid_until)}${expired ? ' (vencido)' : ''}`}
                          >
                            {quote.quote_number}
                          </span>
                          {expired && (
                            <span className="xl:hidden" title={`Validade vencida: ${formatDate(quote.valid_until)}`}>
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-800 font-medium truncate" title={quote.customer?.name}>
                        {quote.customer?.name || '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {formatPrice(quote.total)}
                      </td>
                      <td className="px-3 py-2">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`tabular-nums ${expired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {formatDate(quote.valid_until)}
                          </span>
                          {expired && (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                          {quote.status === 'APPROVED' && (
                            <button
                              onClick={() => handleOpenConvertModal(quote)}
                              className="mr-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                                         text-green-700 bg-green-50 hover:bg-green-100 ring-1 ring-green-200
                                         transition-colors text-[11px] font-semibold"
                              title="Converter em Venda"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Vender
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/quotes/${quote.id}/edit`)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/quotes/${quote.id}/catalog`)}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-md transition-colors"
                            title="Catálogo (apresentação para o cliente)"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { setPdfMenuPos(menuPosFrom(e.currentTarget)); setPdfMenuOpen(pdfMenuOpen === quote.id ? null : quote.id); }}
                              disabled={pdfLoadingId === quote.id}
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                              title="Gerar PDF"
                            >
                              {pdfLoadingId === quote.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {pdfMenuOpen === quote.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setPdfMenuOpen(null)}
                                />
                                <div className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
                                  style={pdfMenuPos ? { top: pdfMenuPos.top, right: pdfMenuPos.right } : undefined}>
                                  <button
                                    onClick={() => handleGeneratePdf(quote.id, 'elegant')}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                  >
                                    <FileText className="w-4 h-4" />
                                    PDF Elegante
                                  </button>
                                  <button
                                    onClick={() => handleGeneratePdf(quote.id, 'print')}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Printer className="w-4 h-4" />
                                    PDF Impressao
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(quote.id, quote.quote_number)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Nenhum orcamento encontrado
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {search || status
                            ? 'Tente ajustar os filtros de busca.'
                            : 'Comece criando seu primeiro orcamento.'}
                        </p>
                      </div>
                      {(search || status) ? (
                        <button
                          onClick={() => {
                            setSearch('');
                            setStatus('');
                            setPage(1);
                          }}
                          className="min-h-[44px] px-4 py-2 text-sm text-blue-600 hover:text-blue-800
                                     hover:bg-blue-50 rounded-lg transition-colors font-medium"
                        >
                          Limpar filtros
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/quotes/new')}
                          className="min-h-[44px] px-4 py-2 text-sm bg-blue-600 text-white rounded-lg
                                     hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Criar Orcamento
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Mostrando {Math.min((page - 1) * limit + 1, totalItems)} a{' '}
            {Math.min(page * limit, totalItems)} de {totalItems} orcamentos
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg
                         text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <span className="px-3 py-2 text-sm text-gray-600 font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg
                         text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-1"
            >
              <span className="hidden sm:inline">Proxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conversion Modal */}
      {convertingQuote && (
        <ConvertToSaleModal
          quote={convertingQuote}
          onClose={() => setConvertingQuote(null)}
          onConfirm={handleConfirmConversion}
          isSubmitting={convertToSale.isPending}
          formatPrice={formatPrice}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
