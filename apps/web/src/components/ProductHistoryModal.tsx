import { useState } from 'react';
import { useProductHistory } from '../hooks/useProducts';
import { useFormatPrice } from '../hooks/useFormatPrice';
import { X, ShoppingCart, TrendingUp, History } from 'lucide-react';

interface ProductHistoryModalProps {
  productId: string;
  productName?: string;
  onClose: () => void;
}

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; } };

export function ProductHistoryModal({ productId, productName, onClose }: ProductHistoryModalProps) {
  const { data, isLoading } = useProductHistory(productId);
  const { formatPrice } = useFormatPrice();
  const [tab, setTab] = useState<'compras' | 'vendas'>('compras');

  const rows = tab === 'compras' ? data?.purchases || [] : data?.sales || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">Histórico do Produto</h3>
            {productName && <p className="text-xs text-gray-500 truncate">{productName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b">
          <button onClick={() => setTab('compras')} className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${tab === 'compras' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <ShoppingCart className="w-4 h-4" /> Compras {data && `(${data.purchases.length})`}
          </button>
          <button onClick={() => setTab('vendas')} className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 ${tab === 'vendas' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}>
            <TrendingUp className="w-4 h-4" /> Vendas {data && `(${data.sales.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-400">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Nenhuma {tab === 'compras' ? 'compra' : 'venda'} registrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-gray-400 border-b">
                  <th className="text-left py-1.5 px-2">Documento</th>
                  <th className="text-left py-1.5 px-2">Data</th>
                  <th className="text-left py-1.5 px-2">{tab === 'compras' ? 'Fornecedor' : 'Cliente'}</th>
                  <th className="text-center py-1.5 px-2">Qtd</th>
                  <th className="text-right py-1.5 px-2">Unit.</th>
                  <th className="text-right py-1.5 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-medium text-gray-700">
                      {r.doc}
                      {r.invoiceNumber && <span className="ml-1 text-[10px] text-gray-400">NF {r.invoiceNumber}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-gray-500">{fmtDate(r.date)}</td>
                    <td className="py-1.5 px-2 text-gray-600 truncate max-w-[140px]">{r.party || '—'}</td>
                    <td className="py-1.5 px-2 text-center font-medium">{r.quantity}</td>
                    <td className="py-1.5 px-2 text-right text-gray-700">{formatPrice(r.unitPrice)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-gray-800">{formatPrice(r.total ?? r.unitPrice * r.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
