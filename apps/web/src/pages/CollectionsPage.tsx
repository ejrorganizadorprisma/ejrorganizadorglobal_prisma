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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Receipt className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobrancas</h1>
          <p className="text-sm text-gray-500">Gerencie cobrancas de vendedores em campo</p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Total Cobrancas</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalCollections}</p>
            <p className="text-sm text-gray-500">{formatPrice(stats.totalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Pendente Aprovacao</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.pendingApprovalCount}</p>
            <p className="text-sm text-gray-500">{formatPrice(stats.pendingApprovalAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Aprovado</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.approvedCount}</p>
            <p className="text-sm text-gray-500">{formatPrice(stats.approvedAmount)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Depositado</span>
            </div>
            <p className="text-xl font-bold text-green-600">{stats.depositedCount}</p>
            <p className="text-sm text-gray-500">{formatPrice(stats.depositedAmount)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Todos vendedores</option>
            {sellers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
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
          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Venda</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Vendedor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Metodo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acoes</th>
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
            <div className="mt-6 flex items-center justify-between">
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
  onGeneratePdf,
  isPdfLoading,
  isApproving,
  isDepositing,
}: CollectionRowProps) {
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggleExpand}>
        <td className="px-4 py-3 font-semibold text-gray-900">{c.collectionNumber}</td>
        <td className="px-4 py-3 text-gray-700">{c.sale?.saleNumber || '-'}</td>
        <td className="px-4 py-3 text-gray-700">{c.customer?.name || c.sale?.customer?.name || '-'}</td>
        <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{c.seller?.name || '-'}</td>
        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(c.amount)}</td>
        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.paymentMethod}</td>
        <td className="px-4 py-3 text-center">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
          {new Date(c.collectedAt || c.createdAt).toLocaleDateString('pt-BR')}
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onToggleExpand}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver detalhes"
            >
              <Eye className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setPdfMenuOpen((v) => !v)}
                disabled={isPdfLoading}
                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                title="Gerar PDF"
              >
                {isPdfLoading ? (
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </button>
              {pdfMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPdfMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
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
            {c.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={onApprove}
                  disabled={isApproving}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Aprovar
                </button>
                <button
                  onClick={onReject}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Rejeitar
                </button>
              </>
            )}
            {c.status === 'APPROVED' && (
              <button
                onClick={onDeposit}
                disabled={isDepositing}
                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Depositado
              </button>
            )}
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
