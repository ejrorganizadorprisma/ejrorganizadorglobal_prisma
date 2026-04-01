import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, AlertTriangle, Search, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductBOM,
  useAddProductPart,
  useRemoveProductPart,
} from '../../hooks/useProductParts';
import { useProducts } from '../../hooks/useProducts';
import { useFormatPrice } from '../../hooks/useFormatPrice';
import { AssemblyAvailabilityModal } from './AssemblyAvailabilityModal';

interface BOMManagerProps {
  productId: string;
}

interface AddPartFormData {
  partId: string;
  quantity: number;
  isOptional: boolean;
}

// Componente de Select com Pesquisa
interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    id: string;
    code: string;
    name: string;
    currentStock: number;
    isAssembly?: boolean;
  }>;
  placeholder?: string;
  required?: boolean;
}

function SearchableSelect({ value, onChange, options, placeholder = 'Selecione...', required }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (o) =>
        o.code.toLowerCase().includes(searchLower) ||
        o.name.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {/* Campo de seleção */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 text-left border rounded-md
          flex items-center justify-between gap-2
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${value ? 'border-gray-300 text-gray-900' : 'border-gray-300 text-gray-500'}
        `}
      >
        <span className="truncate">
          {selectedOption ? (
            <>
              {selectedOption.isAssembly ? '🔧 ' : '⚙️ '}
              {selectedOption.code} - {selectedOption.name}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Input hidden para validação de formulário */}
      {required && <input type="hidden" value={value} required />}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Campo de pesquisa */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por código ou nome..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de opções */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`
                    w-full px-4 py-2 text-left text-sm hover:bg-blue-50
                    flex items-center justify-between
                    ${option.id === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  <span>
                    {option.isAssembly ? '🔧 ' : '⚙️ '}
                    <span className="font-medium">{option.code}</span>
                    {' - '}
                    {option.name}
                    {option.isAssembly && (
                      <span className="ml-1 text-xs text-blue-600">[BOM]</span>
                    )}
                  </span>
                  <span className={`text-xs ${option.currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Est: {option.currentStock}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BOMManager({ productId }: BOMManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [formData, setFormData] = useState<AddPartFormData>({
    partId: '',
    quantity: 1,
    isOptional: false,
  });

  const { formatPrice } = useFormatPrice();
  const { data: bomData, isLoading } = useProductBOM(productId);
  const { data: productsData } = useProducts({ limit: 1000 });
  const addPartMutation = useAddProductPart();
  const removePartMutation = useRemoveProductPart();

  // Permite adicionar tanto peças simples quanto sub-assemblies (BOMs aninhados)
  // Exclui apenas o produto atual para evitar referência circular
  const parts = productsData?.data?.filter((p) =>
    (p.isPart || p.isAssembly) && p.id !== productId
  ) || [];

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partId || formData.quantity <= 0) return;

    try {
      await addPartMutation.mutateAsync({
        productId,
        data: {
          partId: formData.partId,
          quantity: formData.quantity,
          isOptional: formData.isOptional,
        },
      });
      toast.success('Peça adicionada ao BOM');
      setFormData({ partId: '', quantity: 1, isOptional: false });
      setIsAdding(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar peça');
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm('Deseja remover esta peça do BOM?')) return;

    try {
      await removePartMutation.mutateAsync({ productId, partId });
      toast.success('Peça removida do BOM');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao remover peça');
    }
  };

  const totalBOMCost =
    bomData?.reduce((sum, item) => sum + item.totalCost, 0) || 0;

  if (isLoading) {
    return <div className="text-center py-8">Carregando BOM...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">
          BOM - Bill of Materials
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <CheckCircle className="w-4 h-4" />
            Verificar Disponibilidade
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adicionar Peça
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddPart} className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peça *
              </label>
              <SearchableSelect
                value={formData.partId}
                onChange={(value) => setFormData({ ...formData, partId: value })}
                options={parts}
                placeholder="Pesquisar e selecionar uma peça ou sub-assembly..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOptional}
                onChange={(e) =>
                  setFormData({ ...formData, isOptional: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Peça opcional
              </span>
            </label>

            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ partId: '', quantity: 1, isOptional: false });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={addPartMutation.isPending}
              >
                {addPartMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {!bomData || bomData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhuma peça adicionada ao BOM
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Unit.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bomData.map((item) => (
                <tr key={item.partId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.partCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.partName}
                    {item.isAssembly && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        🔧 Sub-BOM
                      </span>
                    )}
                    {item.isOptional && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Opcional
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatPrice(item.unitCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatPrice(item.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-medium ${
                        item.availableStock >= item.quantity
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.availableStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button
                      onClick={() => handleRemovePart(item.partId)}
                      className="text-red-600 hover:text-red-900"
                      title="Remover peça"
                      disabled={removePartMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
                >
                  Custo Total do BOM:
                </td>
                <td
                  colSpan={3}
                  className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right"
                >
                  {formatPrice(totalBOMCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AssemblyAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        productId={productId}
      />
    </div>
  );
}
