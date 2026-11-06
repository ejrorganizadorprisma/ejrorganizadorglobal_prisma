import { useState } from 'react';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useFormatPrice } from '../hooks/useFormatPrice';
import {
  useCommissionConfigs,
  useUpdateCommissionConfig,
  useCommissionEntries,
  useCommissionSummaries,
  useCommissionSettlements,
  useCreateSettlement,
  usePaySettlement,
} from '../hooks/useCommissions';
import type { SellerCommissionConfig, CommissionEntry, CommissionSettlement } from '../hooks/useCommissions';
import { useSellerStats } from '../hooks/useSellers';
import { AppPage } from '@ejr/shared-types';
import { toast } from 'sonner';
import {
  Percent,
  Settings,
  List,
  Wallet,
  Save,
  Clock,
  CheckCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
  X,
} from 'lucide-react';

export function CommissionsPage() {
  const permissionCheck = useRequirePermission({
    page: 'commissions' as AppPage,
    message: 'Voce nao tem permissao para acessar a pagina de comissoes.',
  });

  if (permissionCheck) return permissionCheck;

  return <CommissionsPageContent />;
}

type TabKey = 'config' | 'entries' | 'settlements';

function CommissionsPageContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('config');

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'config', label: 'Configuracao', icon: Settings },
    { key: 'entries', label: 'Entradas', icon: List },
    { key: 'settlements', label: 'Acertos', icon: Wallet },
  ];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 bg-purple-100 rounded-lg shrink-0">
          <Percent className="w-5 h-5 text-purple-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Comissoes</h1>
          <p className="hidden sm:block text-xs text-gray-500">Configuracao e gestao de comissoes de vendedores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border mb-4 overflow-x-auto">
        <div className="flex border-b min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'entries' && <EntriesTab />}
      {activeTab === 'settlements' && <SettlementsTab />}
    </div>
  );
}

/* ============================================================
   Tab: Configuracao
   ============================================================ */
function ConfigTab() {
  const { data: configs, isLoading: loadingConfigs } = useCommissionConfigs();
  const { data: sellers, isLoading: loadingSellers } = useSellerStats();
  const updateConfig = useUpdateCommissionConfig();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSales, setEditSales] = useState(0);
  const [editCollections, setEditCollections] = useState(0);
  const [editByProduct, setEditByProduct] = useState(false);

  // Merge sellers with existing configs
  const configMap = new Map<string, SellerCommissionConfig>();
  configs?.forEach((c) => configMap.set(c.sellerId, c));

  const mergedSellers = (sellers || []).map((s) => {
    const existing = configMap.get(s.id);
    return {
      sellerId: s.id,
      sellerName: s.name,
      sellerEmail: s.email,
      commissionOnSales: existing?.commissionOnSales ?? 0,
      commissionOnCollections: existing?.commissionOnCollections ?? 0,
      commissionByProduct: existing?.commissionByProduct ?? false,
      isActive: existing?.isActive ?? true,
      hasConfig: !!existing,
    };
  });

  const startEdit = (s: typeof mergedSellers[0]) => {
    setEditingId(s.sellerId);
    setEditSales(s.commissionOnSales);
    setEditCollections(s.commissionOnCollections);
    setEditByProduct(s.commissionByProduct);
  };

  const handleSave = async (sellerId: string) => {
    try {
      await updateConfig.mutateAsync({
        sellerId,
        commissionOnSales: editSales,
        commissionOnCollections: editCollections,
        commissionByProduct: editByProduct,
      });
      toast.success('Configuracao atualizada');
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao atualizar configuracao');
    }
  };

  if (loadingConfigs || loadingSellers) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-4 py-2.5 border-b">
        <h2 className="text-sm font-semibold text-gray-900">Configuracao de Comissoes por Vendedor</h2>
        <p className="text-[11px] text-gray-500">Defina os percentuais de comissao sobre vendas e cobrancas para cada vendedor</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="px-3 py-2 text-left whitespace-nowrap">Vendedor</th>
              <th className="px-3 py-2 text-left hidden xl:table-cell whitespace-nowrap">Email</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">% Vendas</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">% Cobrancas</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Por Produto</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mergedSellers.map((s) => {
              const isEditing = editingId === s.sellerId;
              return (
                <tr key={s.sellerId} className="hover:bg-purple-50/40 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[240px] truncate" title={s.sellerName}>{s.sellerName}</td>
                  <td className="px-3 py-2 text-gray-500 hidden xl:table-cell max-w-[220px] truncate" title={s.sellerEmail}>{s.sellerEmail}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editSales}
                        onChange={(e) => setEditSales(parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-[13px] text-center tabular-nums focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    ) : (
                      <span className={s.hasConfig ? 'text-gray-900' : 'text-gray-400'}>{s.commissionOnSales}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editCollections}
                        onChange={(e) => setEditCollections(parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-[13px] text-center tabular-nums focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    ) : (
                      <span className={s.hasConfig ? 'text-gray-900' : 'text-gray-400'}>{s.commissionOnCollections}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editByProduct}
                          onChange={(e) => setEditByProduct(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs text-gray-600">Sim</span>
                      </label>
                    ) : (
                      <span className={`text-xs font-medium ${s.commissionByProduct ? 'text-purple-600' : 'text-gray-400'}`}>
                        {s.commissionByProduct ? 'Sim' : 'Nao'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {s.hasConfig ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-green-100 text-green-800">
                        Configurado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-gray-100 text-gray-500">
                        Sem comissao
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(s.sellerId)}
                          disabled={updateConfig.isPending}
                          className="px-2 py-0.5 text-[11px] font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(s)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
                      >
                        {s.hasConfig ? 'Editar' : 'Definir %'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {mergedSellers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum vendedor encontrado. Cadastre vendedores com role SALESPERSON primeiro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Tab: Entradas
   ============================================================ */
function EntriesTab() {
  const { formatPrice } = useFormatPrice();
  const { data: sellers } = useSellerStats();
  const { data: summaries } = useCommissionSummaries();

  const [page, setPage] = useState(1);
  const [sellerId, setSellerId] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const { data, isLoading } = useCommissionEntries({
    page,
    limit,
    sellerId: sellerId || undefined,
    sourceType: sourceType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const entries = data?.data || [];
  const totalItems = data?.pagination?.total || 0;

  // KPI from summaries
  const totalPending = summaries?.reduce((sum, s) => sum + s.totalPending, 0) || 0;
  const totalSettled = summaries?.reduce((sum, s) => sum + s.totalSettled, 0) || 0;
  const totalCurrentMonth = summaries?.reduce((sum, s) => sum + s.currentMonthEarned, 0) || 0;

  const entryStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-800' },
    SETTLED: { label: 'Liquidado', bg: 'bg-green-100', text: 'text-green-800' },
    CANCELLED: { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500' },
  };

  const sourceTypeLabels: Record<string, string> = {
    SALE: 'Venda',
    COLLECTION: 'Cobranca',
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Total Pendente</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatPrice(totalPending)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Total Liquidado</span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatPrice(totalSettled)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Total Mes Atual</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{formatPrice(totalCurrentMonth)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-3">
        <select
          value={sellerId}
          onChange={(e) => { setSellerId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="">Todos vendedores</option>
          {sellers?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={sourceType}
          onChange={(e) => { setSourceType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="">Todos tipos</option>
          <option value="SALE">Venda</option>
          <option value="COLLECTION">Cobranca</option>
        </select>
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Data inicio"
          />
        </div>
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Data fim"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <List className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma entrada de comissao encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left whitespace-nowrap">Vendedor</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Base</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Taxa</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Comissao</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry: CommissionEntry) => {
                  const sCfg = entryStatusConfig[entry.status] || entryStatusConfig.PENDING;
                  return (
                    <tr key={entry.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-900 max-w-[240px] truncate" title={entry.sellerName}>{entry.sellerName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{sourceTypeLabels[entry.sourceType] || entry.sourceType}</td>
                      <td className="px-3 py-2 text-right text-gray-900 whitespace-nowrap tabular-nums">{formatPrice(entry.baseAmount)}</td>
                      <td className="px-3 py-2 text-center text-gray-600 tabular-nums">{entry.commissionRate}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap tabular-nums">{formatPrice(entry.commissionAmount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${sCfg.bg} ${sCfg.text}`}>
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalItems > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)} de {totalItems}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalItems}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Tab: Acertos (Settlements)
   ============================================================ */
function SettlementsTab() {
  const { formatPrice } = useFormatPrice();
  const { data: sellers } = useSellerStats();

  const [page, setPage] = useState(1);
  const [sellerId, setSellerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const { data, isLoading } = useCommissionSettlements({
    page,
    limit,
    sellerId: sellerId || undefined,
    status: statusFilter || undefined,
  });

  const createSettlement = useCreateSettlement();
  const paySettlement = usePaySettlement();

  const settlements = data?.data || [];
  const totalItems = data?.pagination?.total || 0;

  // New Settlement modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSellerId, setNewSellerId] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const settlementStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-800' },
    PAID: { label: 'Pago', bg: 'bg-green-100', text: 'text-green-800' },
    CANCELLED: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800' },
  };

  const handleCreateSettlement = async () => {
    if (!newSellerId || !newPeriodStart || !newPeriodEnd) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    try {
      await createSettlement.mutateAsync({
        sellerId: newSellerId,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        notes: newNotes || undefined,
      });
      toast.success('Acerto criado com sucesso');
      setShowNewModal(false);
      setNewSellerId('');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      setNewNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar acerto');
    }
  };

  const handlePay = async (id: string) => {
    try {
      await paySettlement.mutateAsync(id);
      toast.success('Acerto marcado como pago');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao marcar como pago');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters + New button */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-3">
        <select
          value={sellerId}
          onChange={(e) => { setSellerId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="">Todos vendedores</option>
          {sellers?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="">Todos status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Acerto
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : settlements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum acerto encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left whitespace-nowrap">Numero</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Vendedor</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                  <th className="px-3 py-2 text-left hidden xl:table-cell whitespace-nowrap">Periodo</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Data</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settlements.map((s: CommissionSettlement) => {
                  const sCfg = settlementStatusConfig[s.status] || settlementStatusConfig.PENDING;
                  return (
                    <tr key={s.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap tabular-nums">{s.settlementNumber}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[240px] truncate" title={s.sellerName}>{s.sellerName}</td>
                      <td className="px-3 py-2 text-right font-semibold text-purple-700 whitespace-nowrap tabular-nums">{formatPrice(s.totalAmount)}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs hidden xl:table-cell whitespace-nowrap tabular-nums">
                        {new Date(s.periodStart).toLocaleDateString('pt-BR')} - {new Date(s.periodEnd).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${sCfg.bg} ${sCfg.text}`}>
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {s.status === 'PENDING' && (
                          <button
                            onClick={() => handlePay(s.id)}
                            disabled={paySettlement.isPending}
                            className="px-2 py-0.5 text-[11px] font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalItems > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)} de {totalItems}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalItems}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Settlement Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Novo Acerto de Comissao</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                <select
                  value={newSellerId}
                  onChange={(e) => setNewSellerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Selecione um vendedor</option>
                  {sellers?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Inicio *</label>
                  <input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => setNewPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodo Fim *</label>
                  <input
                    type="date"
                    value={newPeriodEnd}
                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Observacoes opcionais..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSettlement}
                disabled={createSettlement.isPending || !newSellerId || !newPeriodStart || !newPeriodEnd}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {createSettlement.isPending ? 'Criando...' : 'Criar Acerto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
