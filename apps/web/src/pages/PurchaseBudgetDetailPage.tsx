import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  usePurchaseBudget,
  useApproveBudget,
  useRejectBudget,
  useReopenBudget,
  usePurchaseBudgetAction,
  useCancelBudget,
} from '../hooks/usePurchaseBudgets';
import { useAuth } from '../hooks/useAuth';
import { useActiveDelegations } from '../hooks/useApprovalDelegations';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { generatePurchaseBudgetPdf, generatePurchaseBudgetFullPdf } from '../services/purchaseBudgetPdf';
import { formatPriceValue } from '../hooks/useFormatPrice';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle, XCircle, RotateCcw,
  ShoppingBag, Ban, Pencil, Package, Truck, ExternalLink, DollarSign,
  Plus, Copy, Trash2, CalendarDays, Divide, CreditCard, FileText, Printer,
} from 'lucide-react';
import type { PurchaseBudgetStatus } from '@ejr/shared-types';

const STATUS_LABELS: Record<PurchaseBudgetStatus, string> = {
  DRAFT: 'Rascunho', PENDING: 'Pendente Aprovação', APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado', ORDERED: 'Pedido Autorizado', PURCHASED: 'Comprado',
  RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<PurchaseBudgetStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800', REJECTED: 'bg-red-100 text-red-800',
  ORDERED: 'bg-indigo-100 text-indigo-800', PURCHASED: 'bg-green-100 text-green-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-gray-200 text-gray-500',
};

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviado', CONFIRMED: 'Confirmado',
  PARTIAL: 'Parcial', RECEIVED: 'Recebido', CANCELLED: 'Cancelado',
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800', SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800', PARTIAL: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
};

const PAYMENT_METHODS: Record<string, string> = {
  BOLETO: 'Boleto', BANK_TRANSFER: 'Transferência', PIX: 'PIX',
  CHECK: 'Cheque', CREDIT_CARD: 'Cartão Crédito', CASH: 'Dinheiro', OTHER: 'Outro',
};

const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Atrasado', CANCELLED: 'Cancelado',
};

const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-500',
};

const PRIORITY_LABELS: Record<string, Record<string, string>> = {
  'pt-BR': { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' },
  'es-PY': { LOW: 'Baja', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' },
};

interface InstallmentForm {
  installmentNumber: number;
  amount: string; // display value in reais
  dueDate: string;
  notes: string;
}

export function PurchaseBudgetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: budget, isLoading } = usePurchaseBudget(id);
  const { data: activeDelegations = [] } = useActiveDelegations();
  const { data: documentSettings } = useDefaultDocumentSettings();
  const { data: systemSettings } = useSystemSettings();
  const lang = systemSettings?.language || 'es-PY';

  const approveBudget = useApproveBudget();
  const rejectBudget = useRejectBudget();
  const reopenBudget = useReopenBudget();
  const purchaseAction = usePurchaseBudgetAction();
  const cancelBudget = useCancelBudget();

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [installments, setInstallments] = useState<InstallmentForm[]>([]);
  const [splitCount, setSplitCount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [schedulePattern, setSchedulePattern] = useState('30');

  if (isLoading || !budget) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalAdditionalPercentage = budget?.additionalCosts
    ? budget.additionalCosts.reduce((sum: number, c: any) => sum + c.percentage, 0)
    : 0;

  const isAdmin = user?.role === 'OWNER' || user?.role === 'DIRECTOR';
  const isDelegate = activeDelegations.some((d) => d.delegatedTo === user?.id);
  const canApprove = (isAdmin || isDelegate) && budget.status === 'PENDING';
  const isCreator = budget.createdBy === user?.id;

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

  // ==================== Multi-currency ====================
  const budgetCurrency = (budget.currency || 'BRL') as 'BRL' | 'USD' | 'PYG';
  const formatCurrency = (value: number) => formatPriceValue(value, budgetCurrency);
  const rate1 = budget.exchangeRate1 || 0;
  const rate2 = budget.exchangeRate2 || 0;
  const othersMap: Record<string, ['BRL' | 'USD' | 'PYG', 'BRL' | 'USD' | 'PYG']> = {
    BRL: ['USD', 'PYG'], USD: ['BRL', 'PYG'], PYG: ['BRL', 'USD'],
  };
  const [other1, other2] = othersMap[budgetCurrency];
  const hasRates = rate1 > 0 && rate2 > 0;

  const fmtBRL = (cents: number) => formatPriceValue(cents, 'BRL');
  const fmtUSD = (cents: number) => formatPriceValue(cents, 'USD');
  const fmtPYG = (value: number) => formatPriceValue(value, 'PYG');
  const fmtAmount = (amount: number, cur: string) => {
    if (cur === 'PYG') return fmtPYG(Math.round(amount));
    if (cur === 'USD') return fmtUSD(Math.round(amount * 100));
    return fmtBRL(Math.round(amount * 100));
  };

  const brlCentsToRef = (centsBRL: number) => {
    if (budgetCurrency === 'BRL') return centsBRL / 100;
    return rate1 > 0 ? (centsBRL / 100) / rate1 : 0;
  };
  const brlCentsTo = (centsBRL: number, target: string) => {
    const ref = brlCentsToRef(centsBRL);
    if (target === budgetCurrency) return ref;
    if (target === other1) return ref * rate1;
    return ref * rate2;
  };

  const secondaryPrices = (centsBRL: number): string | null => {
    if (!hasRates) return null;
    return `${fmtAmount(brlCentsTo(centsBRL, other1), other1)} · ${fmtAmount(brlCentsTo(centsBRL, other2), other2)}`;
  };

  // ==================== Installment helpers ====================

  const getTotalCents = () => {
    const fa = parseFloat(finalAmount);
    if (fa > 0) return Math.round(fa * 100);
    return budget.totalAmount;
  };

  const getInstallmentsTotalCents = () => {
    return installments.reduce((sum, inst) => sum + Math.round((parseFloat(inst.amount) || 0) * 100), 0);
  };

  // Parseia o padrão de dias (ex: "28/35/42") em array de números
  // Cada valor = dias a partir da data da NF (absoluto)
  const parseSchedule = (pattern: string): number[] => {
    const parts = pattern.split('/').map((s) => parseInt(s.trim())).filter((n) => n > 0);
    return parts.length > 0 ? parts : [30];
  };

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Retorna os dias desde a NF para a parcela de índice i (0-based)
  // Se há mais parcelas que valores no padrão, extrapola usando o último intervalo
  const getDaysForIndex = (idx: number): number => {
    const days = parseSchedule(schedulePattern);
    if (idx < days.length) return days[idx];
    // Extrapola: último valor + (delta entre os 2 últimos) × quantas parcelas extras
    const lastDelta = days.length > 1
      ? days[days.length - 1] - days[days.length - 2]
      : days[0];
    return days[days.length - 1] + lastDelta * (idx - days.length + 1);
  };

  // Calcula a data de vencimento da parcela i (0-based)
  // Cada valor do padrão = dias a partir da NF
  // Ex: NF 24/03, padrão "28/35/42" → 21/04, 28/04, 05/05
  const getDueDate = (index: number): Date => {
    const baseDate = invoiceDate ? new Date(invoiceDate + 'T12:00:00') : new Date();
    return addDays(baseDate, getDaysForIndex(index));
  };

  const handleAutoSplit = () => {
    const n = parseInt(splitCount);
    if (!n || n < 1) { toast.error('Informe a quantidade de parcelas.'); return; }

    const totalCents = getTotalCents();
    if (totalCents <= 0) { toast.error('Informe o valor final antes de dividir.'); return; }

    const baseAmount = Math.floor(totalCents / n);
    const remainder = totalCents - baseAmount * n;

    const newInstallments: InstallmentForm[] = [];
    for (let i = 0; i < n; i++) {
      const dueDate = getDueDate(i);
      const amount = baseAmount + (i < remainder ? 1 : 0);
      newInstallments.push({
        installmentNumber: i + 1,
        amount: (amount / 100).toFixed(2),
        dueDate: dueDate.toISOString().split('T')[0],
        notes: '',
      });
    }
    setInstallments(newInstallments);
    setSplitCount('');
  };

  const handleAddInstallment = () => {
    const nextDate = getDueDate(installments.length);

    setInstallments([
      ...installments,
      {
        installmentNumber: installments.length + 1,
        amount: '',
        dueDate: nextDate.toISOString().split('T')[0],
        notes: '',
      },
    ]);
  };

  const handleCloneInstallment = (idx: number) => {
    const source = installments[idx];
    const newDate = getDueDate(installments.length);
    setInstallments([
      ...installments,
      {
        installmentNumber: installments.length + 1,
        amount: source.amount,
        dueDate: newDate.toISOString().split('T')[0],
        notes: source.notes,
      },
    ]);
  };

  const handleRemoveInstallment = (idx: number) => {
    const updated = installments.filter((_, i) => i !== idx).map((inst, i) => ({
      ...inst,
      installmentNumber: i + 1,
    }));
    setInstallments(updated);
  };

  const handleUpdateInstallment = (idx: number, field: keyof InstallmentForm, value: string) => {
    const updated = [...installments];
    updated[idx] = { ...updated[idx], [field]: value };
    setInstallments(updated);
  };

  // ==================== Handlers ====================

  const handleApprove = async () => {
    if (!window.confirm('Aprovar este orçamento de compra? Um pedido de compra será gerado automaticamente.')) return;
    try {
      const result = await approveBudget.mutateAsync(id!);
      const poNumber = (result as any)?.purchaseOrder?.orderNumber;
      toast.success(poNumber
        ? `Aprovado! Pedido ${poNumber} gerado.`
        : 'Orçamento de compra aprovado! Pedido gerado.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao aprovar.');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Informe o motivo.'); return; }
    try {
      await rejectBudget.mutateAsync({ id: id!, reason: rejectReason });
      setShowRejectForm(false);
      toast.success('Orçamento de compra rejeitado.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao rejeitar.');
    }
  };

  const handleReopen = async () => {
    try {
      await reopenBudget.mutateAsync(id!);
      toast.success('Orçamento de compra reaberto como rascunho.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao reabrir.');
    }
  };

  const handlePurchase = async () => {
    // Validate installments if any
    if (installments.length > 0) {
      const totalCents = getTotalCents();
      const instTotal = getInstallmentsTotalCents();
      if (Math.abs(instTotal - totalCents) > 1) {
        toast.error(`Soma das parcelas (${formatCurrency(instTotal)}) difere do valor final (${formatCurrency(totalCents)}). Ajuste os valores.`);
        return;
      }
      for (const inst of installments) {
        if (!inst.dueDate) {
          toast.error('Todas as parcelas precisam ter data de vencimento.');
          return;
        }
        if (!parseFloat(inst.amount)) {
          toast.error('Todas as parcelas precisam ter valor.');
          return;
        }
      }
    }

    try {
      await purchaseAction.mutateAsync({
        id: id!,
        invoiceNumber: invoiceNumber || undefined,
        finalAmount: finalAmount ? Math.round(parseFloat(finalAmount) * 100) : undefined,
        paymentMethod: installments.length > 0 ? paymentMethod : undefined,
        installments: installments.length > 0
          ? installments.map((inst) => ({
              installmentNumber: inst.installmentNumber,
              amount: Math.round((parseFloat(inst.amount) || 0) * 100),
              dueDate: inst.dueDate,
              notes: inst.notes || undefined,
            }))
          : undefined,
      });
      setShowPurchaseForm(false);
      toast.success('Compra registrada!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao registrar compra.');
    }
  };

  const handleGeneratePdf = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
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
    generatePurchaseBudgetPdf(budget, pdfSettings, false, budgetCurrency);
  };

  const handleGenerateFullPdf = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
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
    generatePurchaseBudgetFullPdf(budget, pdfSettings, false, budgetCurrency);
  };

  const handleGeneratePdfPrint = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
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
    generatePurchaseBudgetPdf(budget, pdfSettings, true, budgetCurrency);
  };

  const handleGenerateFullPdfPrint = () => {
    if (!budget) return;
    const pdfSettings = documentSettings ? {
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
    generatePurchaseBudgetFullPdf(budget, pdfSettings, true, budgetCurrency);
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancelar este orçamento de compra?')) return;
    try {
      await cancelBudget.mutateAsync(id!);
      toast.success('Orçamento de compra cancelado.');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar.');
    }
  };

  const installmentsDiff = installments.length > 0 ? getInstallmentsTotalCents() - getTotalCents() : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/purchase-budgets')} className="p-2 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-bold">{budget.budgetNumber} - {budget.title}</h1>
          <span className={`mt-1 px-3 py-1 inline-flex text-sm font-semibold rounded-full ${STATUS_COLORS[budget.status]}`}>
            {STATUS_LABELS[budget.status]}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <div className="flex flex-wrap gap-2">
          {budget.status === 'DRAFT' && (
            <button onClick={() => navigate(`/purchase-budgets/${id}/edit`)} className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
              <Pencil className="w-4 h-4" /> Editar
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={handleApprove} disabled={approveBudget.isPending} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Aprovar
              </button>
              <button onClick={() => setShowRejectForm(!showRejectForm)} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                <XCircle className="w-4 h-4" /> Rejeitar
              </button>
            </>
          )}
          {budget.status === 'REJECTED' && isCreator && (
            <button onClick={handleReopen} disabled={reopenBudget.isPending} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50">
              <RotateCcw className="w-4 h-4" /> Reabrir
            </button>
          )}
          {budget.status === 'ORDERED' && (
            <button onClick={() => setShowPurchaseForm(!showPurchaseForm)} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              <ShoppingBag className="w-4 h-4" /> Marcar Comprado
            </button>
          )}
          {budget.status === 'PURCHASED' && budget.purchaseOrder && (
            <button onClick={() => navigate(`/purchase-orders/${budget.purchaseOrder!.id}/conference`)} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
              <Package className="w-4 h-4" /> Recebimento
            </button>
          )}
          {budget.items && budget.items.length > 0 && (
            <>
              <button onClick={handleGeneratePdf} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-l hover:bg-blue-700 text-sm">
                <FileText className="w-4 h-4" /> PDF Cotacao
              </button>
              <button onClick={handleGeneratePdfPrint} className="flex items-center gap-1 px-2 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 text-sm border-l border-blue-700" title="Versao para impressao">
                <Printer className="w-4 h-4" />
              </button>
              <button onClick={handleGenerateFullPdf} className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-l hover:bg-gray-700 text-sm">
                <FileText className="w-4 h-4" /> PDF Completo
              </button>
              <button onClick={handleGenerateFullPdfPrint} className="flex items-center gap-1 px-2 py-2 bg-gray-500 text-white rounded-r hover:bg-gray-600 text-sm border-l border-gray-700" title="Versao para impressao">
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}
          {!['PURCHASED', 'RECEIVED', 'CANCELLED'].includes(budget.status) && (
            <button onClick={handleCancel} disabled={cancelBudget.isPending} className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm disabled:opacity-50">
              <Ban className="w-4 h-4" /> Cancelar
            </button>
          )}
        </div>

        {/* Form Rejeição */}
        {showRejectForm && (
          <div className="mt-3 p-3 bg-red-50 rounded">
            <label className="block text-sm font-medium text-red-700 mb-1">Motivo da rejeição *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-red-300 rounded-md text-sm"
              placeholder="Informe o motivo..."
            />
            <button onClick={handleReject} disabled={rejectBudget.isPending} className="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50">
              Confirmar Rejeição
            </button>
          </div>
        )}

        {/* ===== Form Compra ===== */}
        {showPurchaseForm && (
          <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 space-y-4">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Registrar Compra
            </h3>

            {/* NF + Valor Final */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">N. NF / Recibo</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ex: NF-2026-001"
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Valor Final (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                  placeholder={`Estimado: ${(budget.totalAmount / 100).toFixed(2)}`}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* ===== Parcelas ===== */}
            <div className="border border-green-200 rounded-lg bg-white/60">
              <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Parcelas de Pagamento
                  {installments.length > 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      {installments.length}x
                    </span>
                  )}
                </h4>
              </div>

              <div className="p-4 space-y-3">
                {/* Forma de pagamento + Config parcelas */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {Object.entries(PAYMENT_METHODS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Data da NF</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Intervalo (dias)</label>
                    <input
                      type="text"
                      value={schedulePattern}
                      onChange={(e) => setSchedulePattern(e.target.value)}
                      placeholder="30/45/60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Dias desde NF. Ex: 28/35/42</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dividir em</label>
                      <input
                        type="number"
                        min="1"
                        max="48"
                        value={splitCount}
                        onChange={(e) => setSplitCount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAutoSplit(); }}
                        placeholder="Qtd"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleAutoSplit}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      <Divide className="w-3.5 h-3.5" /> Dividir
                    </button>
                  </div>
                </div>

                {/* Installment rows */}
                {installments.length > 0 && (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">Valor (R$)</div>
                      <div className="col-span-3">Vencimento</div>
                      <div className="col-span-3">Notas</div>
                      <div className="col-span-2 text-center">Ações</div>
                    </div>

                    {installments.map((inst, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center p-2 bg-white rounded-lg border border-gray-100 hover:border-green-200 transition-colors"
                      >
                        <div className="col-span-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            {inst.installmentNumber}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={inst.amount}
                            onChange={(e) => handleUpdateInstallment(idx, 'amount', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          {hasRates && parseFloat(inst.amount) > 0 && (
                            <span className="text-[10px] text-gray-400 leading-tight block mt-0.5">
                              {secondaryPrices(Math.round(parseFloat(inst.amount) * 100))}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => handleUpdateInstallment(idx, 'dueDate', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={inst.notes}
                            onChange={(e) => handleUpdateInstallment(idx, 'notes', e.target.value)}
                            placeholder="Obs..."
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCloneInstallment(idx)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                            title="Clonar parcela (+1 mês)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveInstallment(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Resumo */}
                    <div className={`px-3 py-2 rounded-lg text-sm ${
                      Math.abs(installmentsDiff) <= 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>
                          Total parcelas: <strong>{formatCurrency(getInstallmentsTotalCents())}</strong>
                          {' / '}Valor final: <strong>{formatCurrency(getTotalCents())}</strong>
                        </span>
                        {Math.abs(installmentsDiff) > 1 && (
                          <span className="font-semibold">
                            Diferença: {formatCurrency(Math.abs(installmentsDiff))}
                          </span>
                        )}
                      </div>
                      {hasRates && getInstallmentsTotalCents() > 0 && (
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {secondaryPrices(getInstallmentsTotalCents())}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Adicionar parcela */}
                <button
                  onClick={handleAddInstallment}
                  className="flex items-center gap-1.5 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm transition-colors w-full justify-center border border-dashed border-green-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Parcela
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { setShowPurchaseForm(false); setInstallments([]); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchaseAction.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                {purchaseAction.isPending ? 'Registrando...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dados do Orçamento */}
      <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informações</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500 block">Prioridade</span><span className="font-medium">{PRIORITY_LABELS[lang]?.[budget.priority] || budget.priority}</span></div>
          <div><span className="text-gray-500 block">Departamento</span><span className="font-medium">{budget.department || '-'}</span></div>
          <div><span className="text-gray-500 block">Fornecedor</span><span className="font-medium">{budget.supplierName || '-'}</span></div>
          <div><span className="text-gray-500 block">Total</span><span className="font-bold text-lg">{formatCurrency(budget.totalAmount)}</span></div>
          <div><span className="text-gray-500 block">Cond. Pagamento</span><span className="font-medium">{budget.paymentTerms || '-'}</span></div>
          <div><span className="text-gray-500 block">Prazo Entrega</span><span className="font-medium">{budget.leadTimeDays ? `${budget.leadTimeDays} dias` : '-'}</span></div>
          <div><span className="text-gray-500 block">Criado por</span><span className="font-medium">{budget.createdByUser?.name || '-'}</span></div>
          <div><span className="text-gray-500 block">Data Criação</span><span className="font-medium">{formatDate(budget.createdAt)}</span></div>
          {budget.approvedByUser && (
            <div><span className="text-gray-500 block">{budget.status === 'REJECTED' ? 'Rejeitado por' : 'Aprovado por'}</span><span className="font-medium">{budget.approvedByUser.name}</span></div>
          )}
          {budget.approvedAt && (
            <div><span className="text-gray-500 block">Data Aprovação</span><span className="font-medium">{formatDate(budget.approvedAt)}</span></div>
          )}
          {budget.rejectionReason && (
            <div className="col-span-2 md:col-span-4 bg-red-50 p-3 rounded">
              <span className="text-red-700 text-sm font-medium">Motivo da rejeição: </span>
              <span className="text-red-600 text-sm">{budget.rejectionReason}</span>
            </div>
          )}
          {budget.purchasedByUser && (
            <>
              <div><span className="text-gray-500 block">Comprado por</span><span className="font-medium">{budget.purchasedByUser.name}</span></div>
              <div><span className="text-gray-500 block">Data Compra</span><span className="font-medium">{formatDate(budget.purchasedAt)}</span></div>
              {budget.invoiceNumber && <div><span className="text-gray-500 block">NF/Recibo</span><span className="font-medium">{budget.invoiceNumber}</span></div>}
              {budget.finalAmount && <div><span className="text-gray-500 block">Valor Final</span><span className="font-bold">{formatCurrency(budget.finalAmount)}</span></div>}
              {budget.paymentMethod && <div><span className="text-gray-500 block">Forma Pagamento</span><span className="font-medium">{PAYMENT_METHODS[budget.paymentMethod] || budget.paymentMethod}</span></div>}
            </>
          )}
        </div>
        {budget.description && <div className="mt-4"><span className="text-gray-500 text-sm block">Descrição</span><p className="text-sm">{budget.description}</p></div>}
        {budget.justification && <div className="mt-2"><span className="text-gray-500 text-sm block">Justificativa</span><p className="text-sm">{budget.justification}</p></div>}
      </div>

      {/* ===== Parcelas de Pagamento (read-only) ===== */}
      {budget.paymentInstallments && budget.paymentInstallments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Parcelas de Pagamento
            {budget.paymentMethod && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {PAYMENT_METHODS[budget.paymentMethod] || budget.paymentMethod}
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budget.paymentInstallments.map((inst: any) => {
                  const isOverdue = inst.status === 'PENDING' && new Date(inst.dueDate) < new Date();
                  const displayStatus = isOverdue ? 'OVERDUE' : inst.status;
                  return (
                    <tr key={inst.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {inst.installmentNumber}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold">{formatCurrency(inst.amount)}</span>
                        {secondaryPrices(inst.amount) && (
                          <span className="block text-[10px] text-gray-400">{secondaryPrices(inst.amount)}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDate(inst.dueDate)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${INSTALLMENT_STATUS_COLORS[displayStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {INSTALLMENT_STATUS_LABELS[displayStatus] || displayStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{inst.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(() => {
            const instTotal = budget.paymentInstallments!.reduce((sum: number, i: any) => sum + i.amount, 0);
            return (
              <div className="mt-3 flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="text-gray-500">{budget.paymentInstallments!.length} parcela(s)</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900">Total: {formatCurrency(instTotal)}</span>
                  {secondaryPrices(instTotal) && (
                    <span className="block text-[10px] text-gray-500">{secondaryPrices(instTotal)}</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Custos Adicionais */}
      {budget.additionalCosts && budget.additionalCosts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            Custos Adicionais
          </h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {budget.additionalCosts.map((cost: any) => (
              <div key={cost.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="font-medium text-amber-800">{cost.name}</span>
                <span className="text-amber-600 font-bold">{cost.percentage}%</span>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-amber-700">
              Total custos adicionais: <strong>+{totalAdditionalPercentage.toFixed(1)}%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Pedido Vinculado */}
      {budget.purchaseOrder && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Truck className="w-6 h-6 text-indigo-600" />
              <div>
                <span className="text-sm text-indigo-600 font-medium">Pedido de Compra Gerado</span>
                <p className="text-lg font-bold text-indigo-900">{budget.purchaseOrder.orderNumber}</p>
              </div>
              <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${PO_STATUS_COLORS[budget.purchaseOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                {PO_STATUS_LABELS[budget.purchaseOrder.status] || budget.purchaseOrder.status}
              </span>
            </div>
            <button
              onClick={() => navigate(`/purchase-orders/${budget.purchaseOrder!.id}`)}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Ver Pedido
            </button>
          </div>
        </div>
      )}

      {/* Itens + Cotações */}
      {budget.items && budget.items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Itens e Cotações</h2>
          <div className="space-y-4">
            {budget.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-semibold">{item.productName}</span>
                    <span className="text-gray-500 ml-2">x{item.quantity} {item.unit}</span>
                  </div>
                  {item.selectedQuoteId && item.quotes && (() => {
                    const selQuote = item.quotes.find((q) => q.id === item.selectedQuoteId);
                    const unitPrice = selQuote?.unitPrice || 0;
                    const unitWithCosts = Math.round(unitPrice * (1 + totalAdditionalPercentage / 100));
                    return (
                      <div className="text-right">
                        <span className="text-green-700 font-bold">
                          {formatCurrency(unitPrice * item.quantity)}
                        </span>
                        {totalAdditionalPercentage > 0 && (
                          <>
                            <span className="text-[10px] text-gray-400 block">
                              unit. c/ adic.: {formatCurrency(unitWithCosts)}
                            </span>
                            <span className="text-xs text-green-600 font-semibold block">
                              c/ adic.: {formatCurrency(unitWithCosts * item.quantity)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {item.quotes && item.quotes.length > 0 && (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Fornecedor</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Preço Unit.</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Total</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {item.quotes.map((q) => (
                        <tr key={q.id} className={q.id === item.selectedQuoteId ? 'bg-green-50 font-semibold' : ''}>
                          <td className="px-3 py-2">{q.supplierName}</td>
                          <td className="px-3 py-2">
                            {formatCurrency(q.unitPrice)}
                            {totalAdditionalPercentage > 0 && (
                              <span className="text-xs text-green-600 block">
                                c/ adic.: {formatCurrency(Math.round(q.unitPrice * (1 + totalAdditionalPercentage / 100)))} /un
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {formatCurrency(q.unitPrice * item.quantity)}
                            {totalAdditionalPercentage > 0 && (
                              <span className="text-xs text-green-600 block">
                                c/ adic.: {formatCurrency(Math.round(q.unitPrice * (1 + totalAdditionalPercentage / 100)) * item.quantity)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {q.id === item.selectedQuoteId ? (
                              <span className="text-green-600 text-xs font-bold">Selecionada</span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
