import { useState } from 'react';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import {
  useCollections,
  useCollectionStats,
  useApproveCollection,
  useRejectCollection,
  useDepositCollection,
  useRevertCollection,
} from '../hooks/useCollections';
import type { Collection } from '../hooks/useCollections';
import { useSellerStats } from '../hooks/useSellers';
import { AppPage } from '@ejr/shared-types';
import { generateCollectionPDF, type CollectionPdfMode } from '../utils/collectionPdfGenerator';
import { toast } from 'sonner';
import {
  Receipt,
  Clock,
  CheckCircle,
  Landmark,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Image,
  Eye,
  Loader2,
  FileText,
  Printer,
  Check,
  Undo2,
} from 'lucide-react';

const statusConfig: Record<
  Collection['status'],
  { label: string; bg: string; text: string }
> = {
  PENDING_APPROVAL: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-800' },
  APPROVED: { label: 'Aprovado', bg: 'bg-blue-100', text: 'text-blue-800' },
  DEPOSITED: { label: 'Depositado', bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-800' },
};

/** Posição do menu flutuante a partir do botão (abre para cima perto do fim da tela). */
function menuPosFrom(el: HTMLElement, menuHeight = 110) {
  const r = el.getBoundingClientRect();
  const up = r.bottom + menuHeight + 8 > window.innerHeight;
  return { top: up ? Math.max(8, r.top - menuHeight - 4) : r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) };
}

export function CollectionsPage() {
  const permissionCheck = useRequirePermission({
    page: 'collections' as AppPage,
    message: 'Voce nao tem permissao para acessar a pagina de cobrancas.',
  });

  if (permissionCheck) return permissionCheck;

  return <CollectionsPageContent />;
}

function CollectionsPageContent() {
  const { formatPrice, defaultCurrency } = useFormatPrice();
  const { data: documentSettings } = useDefaultDocumentSettings();

  // Filters
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  // Detail/expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // PDF
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // Reject modal
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Data
  const { data, isLoading } = useCollections({
    page,
    limit,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sellerId: sellerId || undefined,
  });

  const { data: stats } = useCollectionStats({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: sellers } = useSellerStats();

  // Mutations
  const approveCollection = useApproveCollection();
  const rejectCollection = useRejectCollection();
  const depositCollection = useDepositCollection();
  const revertCollection = useRevertCollection();
  const [revertModalId, setRevertModalId] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');

  const collections = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total || 0;

  const hasActiveFilters = status || startDate || endDate || sellerId;

  const clearFilters = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSellerId('');
    setPage(1);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCollection.mutateAsync(id);
      toast.success('Cobranca aprovada com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao aprovar cobranca');
    }
  };

  const handleReject = async () => {
    if (!rejectModalId || !rejectReason.trim()) {
      toast.error('Informe o motivo da rejeicao');
      return;
    }
    try {
      await rejectCollection.mutateAsync({ id: rejectModalId, reason: rejectReason.trim() });
      toast.success('Cobranca rejeitada');
      setRejectModalId(null);
      setRejectReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao rejeitar cobranca');
    }
  };

  // Estorno: a aprovação baixou parcelas da venda, então desfazer precisa
  // devolvê-las — não basta mudar o status da cobrança.
  const handleRevert = async () => {
    if (!revertModalId || !revertReason.trim()) {
      toast.error('Informe o motivo do estorno');
      return;
    }
    try {
      await revertCollection.mutateAsync({ id: revertModalId, reason: revertReason.trim() });
      toast.success('Cobrança estornada. As parcelas voltaram a ficar em aberto.');
      setRevertModalId(null);
      setRevertReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.error || 'Erro ao estornar');
    }
  };

  const handleDeposit = async (id: string) => {
    try {
      await depositCollection.mutateAsync(id);
      toast.success('Cobranca marcada como depositada');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao marcar como depositado');
    }
  };

  const handleGeneratePdf = (collection: Collection, mode: CollectionPdfMode) => {
    setPdfLoadingId(collection.id);
    try {
      generateCollectionPDF(collection, documentSettings, defaultCurrency, mode);
      toast.success(mode === 'print' ? 'PDF para impressao gerado' : 'PDF elegante gerado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'desconhecido'));
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
          <Receipt className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Cobrancas</h1>
          <p className="hidden sm:block text-xs text-gray-500">Gerencie cobrancas de vendedores em campo</p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border px-3 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <Receipt className="w-4 h-4 text-gray-400" />
              <span className="text-[10.5px] font-medium text-gray-500 uppercase tracking-wider truncate">Total Cobrancas</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-gray-900">{stats.totalCollections}</p>
            <p className="text-xs text-gray-500 tabular-nums truncate">{formatPrice(stats.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border px-3 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10.5px] font-medium text-gray-500 uppercase tracking-wider truncate">Pendente Aprovacao</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-amber-600">{stats.pendingApprovalCount}</p>
            <p className="text-xs text-gray-500 tabular-nums truncate">{formatPrice(stats.pendingApprovalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border px-3 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-[10.5px] font-medium text-gray-500 uppercase tracking-wider truncate">Aprovado</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-blue-600">{stats.approvedCount}</p>
            <p className="text-xs text-gray-500 tabular-nums truncate">{formatPrice(stats.approvedAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border px-3 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <Landmark className="w-4 h-4 text-green-500" />
              <span className="text-[10.5px] font-medium text-gray-500 uppercase tracking-wider truncate">Depositado</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-green-600">{stats.depositedCount}</p>
            <p className="text-xs text-gray-500 tabular-nums truncate">{formatPrice(stats.depositedAmount)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border mb-4">
        <div className="p-2.5 flex flex-col sm:flex-row gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Todos status</option>
            <option value="PENDING_APPROVAL">Pendente Aprovacao</option>
            <option value="APPROVED">Aprovado</option>
            <option value="DEPOSITED">Depositado</option>
            <option value="REJECTED">Rejeitado</option>
          </select>
          <select
            value={sellerId}
            onChange={(e) => { setSellerId(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Todos vendedores</option>
            {sellers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Datas</span>
          </button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Carregando cobrancas...</p>
          </div>
        </div>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Nenhuma cobranca encontrada</p>
          <p className="text-sm text-gray-400">
            {hasActiveFilters ? 'Tente alterar os filtros' : 'Ainda nao ha cobrancas registradas'}
          </p>
        </div>
      ) : (
        <>
          {/* Table — compacta, 1 linha por cobrança */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] table-fixed text-[13px]">
                <colgroup>
                  <col className="w-[124px]" />
                  <col className="hidden xl:table-column w-[124px]" />
                  <col />
                  <col className="hidden xl:table-column w-[130px]" />
                  <col className="w-[118px]" />
                  <col className="hidden xl:table-column w-[100px]" />
                  <col className="w-[112px]" />
                  <col className="hidden xl:table-column w-[84px]" />
                  <col className="w-[196px]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Numero</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Venda</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Vendedor</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Metodo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="hidden xl:table-cell px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {collections.map((c) => {
                    const cfg = statusConfig[c.status];
                    const isExpanded = expandedId === c.id;
                    return (
                      <CollectionRow
                        key={c.id}
                        collection={c}
                        statusCfg={cfg}
                        isExpanded={isExpanded}
                        formatPrice={formatPrice}
                        onToggleExpand={() => setExpandedId(isExpanded ? null : c.id)}
                        onApprove={() => handleApprove(c.id)}
                        onReject={() => { setRejectModalId(c.id); setRejectReason(''); }}
                        onDeposit={() => handleDeposit(c.id)}
                        onRevert={() => { setRevertModalId(c.id); setRevertReason(''); }}
                        onGeneratePdf={(mode) => handleGeneratePdf(c, mode)}
                        isPdfLoading={pdfLoadingId === c.id}
                        isApproving={approveCollection.isPending}
                        isDepositing={depositCollection.isPending}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > limit && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)} de {totalItems}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= totalItems}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Revert Modal — estorno de cobrança já aprovada/depositada */}
      {revertModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Estornar Cobrança</h3>
            <p className="text-sm text-gray-500 mb-4">
              As parcelas da venda que esta cobrança quitou voltam a ficar em aberto,
              e a comissão gerada por ela é cancelada.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do estorno</label>
              <textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="Ex: cheque devolvido, lançamento em duplicidade..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRevertModalId(null); setRevertReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevert}
                disabled={revertCollection.isPending || !revertReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {revertCollection.isPending ? 'Estornando...' : 'Estornar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rejeitar Cobranca</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da rejeicao</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                placeholder="Informe o motivo..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModalId(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={rejectCollection.isPending || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {rejectCollection.isPending ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CollectionRowProps {
  collection: Collection;
  statusCfg: { label: string; bg: string; text: string };
  isExpanded: boolean;
  formatPrice: (value: number) => string;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDeposit: () => void;
  onRevert: () => void;
  onGeneratePdf: (mode: CollectionPdfMode) => void;
  isPdfLoading: boolean;
  isApproving: boolean;
  isDepositing: boolean;
}

function CollectionRow({
  collection: c,
  statusCfg: cfg,
  isExpanded,
  formatPrice,
  onToggleExpand,
  onApprove,
  onReject,
  onDeposit,
  onRevert,
  onGeneratePdf,
  isPdfLoading,
  isApproving,
  isDepositing,
}: CollectionRowProps) {
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [pdfMenuPos, setPdfMenuPos] = useState<{ top: number; right: number } | null>(null);
  return (
    <>
      <tr className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`} onClick={onToggleExpand}>
        <td className="px-3 py-2">
          <span
            className="font-semibold text-gray-900 whitespace-nowrap tabular-nums"
            title={[
              c.sale?.saleNumber ? `Venda ${c.sale.saleNumber}` : null,
              c.seller?.name ? `Vendedor: ${c.seller.name}` : null,
              c.paymentMethod ? `Método: ${c.paymentMethod}` : null,
              new Date(c.collectedAt || c.createdAt).toLocaleDateString('pt-BR'),
            ].filter(Boolean).join(' · ')}
          >
            {c.collectionNumber}
          </span>
        </td>
        <td className="hidden xl:table-cell px-3 py-2 text-gray-600 whitespace-nowrap tabular-nums truncate">{c.sale?.saleNumber || '-'}</td>
        <td className="px-3 py-2 text-gray-800 font-medium truncate" title={c.customer?.name || c.sale?.customer?.name || undefined}>
          {c.customer?.name || c.sale?.customer?.name || '-'}
        </td>
        <td className="hidden xl:table-cell px-3 py-2 text-gray-500 truncate" title={c.seller?.name || undefined}>{c.seller?.name || '-'}</td>
        <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">{formatPrice(c.amount)}</td>
        <td className="hidden xl:table-cell px-3 py-2 text-gray-500 truncate" title={c.paymentMethod}>{c.paymentMethod}</td>
        <td className="px-3 py-2">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </td>
        <td className="hidden xl:table-cell px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">
          {new Date(c.collectedAt || c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </td>
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
            {c.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={onApprove}
                  disabled={isApproving}
                  className="mr-0.5 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  title="Aprovar"
                >
                  <Check className="w-3 h-3" /> Aprovar
                </button>
                <button
                  onClick={onReject}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  title="Rejeitar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {c.status === 'APPROVED' && (
              <button
                onClick={onDeposit}
                disabled={isDepositing}
                className="mr-0.5 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                title="Marcar como depositado"
              >
                <Landmark className="w-3 h-3" /> Depositado
              </button>
            )}
            {(c.status === 'APPROVED' || c.status === 'DEPOSITED') && (
              <button
                onClick={onRevert}
                title="Estornar: devolve as parcelas da venda que esta cobrança quitou"
                className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-md transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Ver detalhes"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => { setPdfMenuPos(menuPosFrom(e.currentTarget)); setPdfMenuOpen((v) => !v); }}
                disabled={isPdfLoading}
                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50"
                title="Gerar PDF"
              >
                {isPdfLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </button>
              {pdfMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPdfMenuOpen(false)}
                  />
                  <div className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
                                  style={pdfMenuPos ? { top: pdfMenuPos.top, right: pdfMenuPos.right } : undefined}>
                    <button
                      onClick={() => {
                        setPdfMenuOpen(false);
                        onGeneratePdf('elegant');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      PDF Elegante
                    </button>
                    <button
                      onClick={() => {
                        setPdfMenuOpen(false);
                        onGeneratePdf('print');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      PDF Impressao
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Photos */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Image className="w-3 h-3" /> Fotos
                </h4>
                {c.photos && c.photos.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {c.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo}
                          alt={`Foto ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sem fotos</p>
                )}
              </div>

              {/* Check details */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Detalhes do Pagamento</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Metodo:</span> <span className="text-gray-900">{c.paymentMethod}</span></p>
                  {c.checkNumber && (
                    <p><span className="text-gray-500">Cheque N:</span> <span className="text-gray-900">{c.checkNumber}</span></p>
                  )}
                  {c.checkBank && (
                    <p><span className="text-gray-500">Banco:</span> <span className="text-gray-900">{c.checkBank}</span></p>
                  )}
                  {c.checkDate && (
                    <p><span className="text-gray-500">Data Cheque:</span> <span className="text-gray-900">{new Date(c.checkDate).toLocaleDateString('pt-BR')}</span></p>
                  )}
                  {c.rejectionReason && (
                    <p><span className="text-red-500">Motivo Rejeicao:</span> <span className="text-red-700">{c.rejectionReason}</span></p>
                  )}
                  {c.notes && (
                    <p><span className="text-gray-500">Obs:</span> <span className="text-gray-900">{c.notes}</span></p>
                  )}
                </div>
              </div>

              {/* GPS */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Localizacao GPS
                </h4>
                {c.latitude && c.longitude ? (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Lat:</span> <span className="text-gray-900">{c.latitude}</span></p>
                    <p><span className="text-gray-500">Lng:</span> <span className="text-gray-900">{c.longitude}</span></p>
                    <a
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors mt-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Ver no Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sem coordenadas GPS</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
