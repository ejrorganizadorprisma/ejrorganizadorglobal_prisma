import { useProductSuppliers } from '../hooks/useProductSuppliers';
import { Building2, Star, Truck, Check, Store } from 'lucide-react';

interface ProductSupplierOptionsPanelProps {
  productId: string;
  currentSupplierId?: string;
  /** Define o fornecedor do orçamento e (opcional) o preço de catálogo em centavos BRL */
  onPick: (supplierId: string, unitPriceCents: number) => void;
}

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

export function ProductSupplierOptionsPanel({ productId, currentSupplierId, onPick }: ProductSupplierOptionsPanelProps) {
  const { data: suppliers, isLoading } = useProductSuppliers(productId);

  if (isLoading) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 animate-pulse">
        <div className="h-4 w-40 bg-violet-200 rounded" />
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
        <Store className="w-3.5 h-3.5 text-gray-400" />
        Nenhum fornecedor cadastrado para este produto.
        <span className="text-gray-400">Cadastre na aba "Fornecedores" do produto para comparar preços.</span>
      </div>
    );
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-semibold text-violet-800">Opções de compra ({suppliers.length} fornecedor{suppliers.length > 1 ? 'es' : ''})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suppliers.map((sp: any) => {
          const selected = sp.supplierId === currentSupplierId;
          return (
            <div
              key={sp.id}
              className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${selected ? 'border-violet-400 bg-white ring-1 ring-violet-300' : 'border-violet-100 bg-white'}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate">{sp.supplier?.name || '—'}</span>
                  {sp.isPreferred && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                      <Star className="w-2.5 h-2.5" /> Preferencial
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span className="font-semibold text-gray-700">{brl(sp.unitPrice)}</span>
                  {sp.leadTimeDays > 0 && (
                    <span className="inline-flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{sp.leadTimeDays}d</span>
                  )}
                  {sp.supplierSku && <span className="text-gray-400">SKU {sp.supplierSku}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPick(sp.supplierId, sp.unitPrice)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 flex items-center gap-1 ${selected ? 'bg-violet-100 text-violet-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
              >
                {selected ? <><Check className="w-3 h-3" /> Atual</> : 'Usar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
