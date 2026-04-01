import { useState, useEffect } from 'react';
import { Package, Save, X, Search, History } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { api } from '../lib/api';
import { toast } from 'sonner';
import InventoryMovementHistoryModal from '../components/InventoryMovementHistoryModal';
import { AccessDenied } from '../components/AccessDenied';

interface StockAdjustment {
  productId: string;
  currentStock: number;
  newStock: number;
  reason: string;
}

export function StockAdjustmentPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adjustments, setAdjustments] = useState<Map<string, StockAdjustment>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string; code?: string } | null>(null);

  const { user } = useAuth();
  const { hasPermission } = usePagePermissions();
  const { data: productsData, isLoading, refetch } = useProducts({
    page,
    limit: 50,
    search: search || undefined,
  });

  // Verificar permissão usando o sistema de permissões
  const hasAccess = hasPermission('stock_adjustment');

  // Se não tiver permissão, mostrar mensagem de acesso negado
  if (!hasAccess) {
    return <AccessDenied message="Você não tem permissão para acessar a página de ajuste de estoque." />;
  }

  const handleAdjustmentChange = (
    productId: string,
    currentStock: number,
    newStock: string,
    reason: string
  ) => {
    const newStockNum = parseInt(newStock) || 0;

    if (newStockNum === currentStock) {
      // Remove adjustment if stock is back to original
      const newAdjustments = new Map(adjustments);
      newAdjustments.delete(productId);
      setAdjustments(newAdjustments);
    } else {
      setAdjustments(
        new Map(adjustments).set(productId, {
          productId,
          currentStock,
          newStock: newStockNum,
          reason,
        })
      );
    }
  };

  const handleSaveAdjustments = async () => {
    if (adjustments.size === 0) {
      toast.error('Nenhum ajuste para salvar');
      return;
    }

    // Validar que todos têm motivo
    for (const [, adj] of adjustments) {
      if (!adj.reason.trim()) {
        toast.error('Todos os ajustes precisam ter um motivo');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Salvar cada ajuste
      const promises = Array.from(adjustments.values()).map(async (adj) => {
        const difference = adj.newStock - adj.currentStock;
        const operation = difference > 0 ? 'add' : 'subtract';
        const quantity = Math.abs(difference);

        return api.patch(`/products/${adj.productId}/stock`, {
          quantity,
          operation,
          reason: adj.reason,
        });
      });

      await Promise.all(promises);

      toast.success(`${adjustments.size} ajuste(s) de estoque salvos com sucesso`);
      setAdjustments(new Map());
      refetch();
    } catch (error: any) {
      console.error('Erro ao ajustar estoque:', error);
      toast.error(error.response?.data?.message || 'Erro ao ajustar estoque');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAdjustment = (productId: string) => {
    const newAdjustments = new Map(adjustments);
    newAdjustments.delete(productId);
    setAdjustments(newAdjustments);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Ajuste de Estoque</h1>
          <p className="text-gray-600 mt-1">
            Ajuste manual de estoque de produtos (apenas Administrador)
          </p>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {adjustments.size > 0 && (
            <button
              onClick={handleSaveAdjustments}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Salvar {adjustments.size} Ajuste(s)
            </button>
          )}
        </div>

        {adjustments.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{adjustments.size}</strong> produto(s) com ajuste pendente.
              Clique em "Salvar" para aplicar as alterações.
            </p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando produtos...</div>
        ) : !productsData?.data || productsData.data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque Atual
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Novo Estoque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo do Ajuste
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Histórico
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productsData.data.map((product) => {
                  const adjustment = adjustments.get(product.id);
                  const hasAdjustment = !!adjustment;

                  return (
                    <tr
                      key={product.id}
                      className={hasAdjustment ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-gray-900">
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          min="0"
                          value={adjustment?.newStock ?? product.currentStock}
                          onChange={(e) =>
                            handleAdjustmentChange(
                              product.id,
                              product.currentStock,
                              e.target.value,
                              adjustment?.reason || ''
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="w-24 px-3 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          placeholder="Ex: Inventário, Perda, Ajuste..."
                          value={adjustment?.reason || ''}
                          onChange={(e) =>
                            handleAdjustmentChange(
                              product.id,
                              product.currentStock,
                              String(adjustment?.newStock ?? product.currentStock),
                              e.target.value
                            )
                          }
                          disabled={!hasAdjustment}
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {hasAdjustment && (
                          <button
                            onClick={() => handleCancelAdjustment(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar ajuste"
                          >
                            <X className="w-5 h-5 inline" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() =>
                            setHistoryProduct({
                              id: product.id,
                              name: product.name,
                              code: product.code,
                            })
                          }
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver histórico de ajustes"
                        >
                          <History className="w-5 h-5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {productsData && productsData.pagination && productsData.pagination.totalPages > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{productsData.pagination.totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= productsData.pagination.totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Histórico */}
      <InventoryMovementHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        productId={historyProduct?.id || ''}
        productName={historyProduct?.name || ''}
        productCode={historyProduct?.code}
      />
    </div>
  );
}
