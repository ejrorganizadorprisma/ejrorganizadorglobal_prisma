import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Package, Plus, Minus, Search, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateProductionBatch } from '../hooks/useProductionBatches';
import { useProducts } from '../hooks/useProducts';

// Componente de Select com Pesquisa para Produtos
interface ProductSearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    id: string;
    code: string;
    name: string;
    currentStock: number;
  }>;
  placeholder?: string;
  hasError?: boolean;
}

function ProductSearchableSelect({ value, onChange, options, placeholder = 'Selecione...', hasError }: ProductSearchableSelectProps) {
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
          ${hasError ? 'border-red-500' : 'border-gray-300'}
          ${value ? 'text-gray-900' : 'text-gray-500'}
        `}
      >
        <span className="truncate">
          {selectedOption ? (
            <>
              🔧 {selectedOption.code} - {selectedOption.name}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

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
                    🔧{' '}
                    <span className="font-medium">{option.code}</span>
                    {' - '}
                    {option.name}
                  </span>
                  <span className={`text-xs ${option.currentStock > 0 ? 'text-green-600' : 'text-gray-500'}`}>
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

export function ProductionBatchFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateProductionBatch();
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  // Filtrar apenas produtos que são assemblies (montados)
  const assemblyProducts = productsData?.data?.filter((p) => p.isAssembly) || [];

  const [formData, setFormData] = useState({
    productId: '',
    quantityPlanned: 1,
    plannedStartDate: '',
    plannedEndDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    const newErrors: Record<string, string> = {};
    if (!formData.productId) {
      newErrors.productId = 'Produto é obrigatório';
    }
    if (formData.quantityPlanned < 1) {
      newErrors.quantityPlanned = 'Quantidade deve ser pelo menos 1';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const batch = await createMutation.mutateAsync({
        productId: formData.productId,
        quantityPlanned: formData.quantityPlanned,
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Lote de produção criado com sucesso');
      navigate(`/production-batches/${batch.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar lote');
    }
  };

  const selectedProduct = assemblyProducts.find((p) => p.id === formData.productId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/production-batches')}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Novo Lote de Produção</h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="bg-white rounded-lg shadow p-4 lg:p-6 space-y-6">
            {/* Produto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produto a Produzir *
              </label>
              <ProductSearchableSelect
                value={formData.productId}
                onChange={(value) => {
                  setFormData({ ...formData, productId: value });
                  setErrors({ ...errors, productId: '' });
                }}
                options={assemblyProducts}
                placeholder="Pesquisar e selecionar um produto..."
                hasError={!!errors.productId}
              />
              {errors.productId && (
                <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
              )}
              {assemblyProducts.length === 0 && (
                <p className="mt-1 text-sm text-yellow-600">
                  Nenhum produto montado (assembly) encontrado. Cadastre produtos com BOM primeiro.
                </p>
              )}
            </div>

            {/* Produto selecionado - Info */}
            {selectedProduct && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                    <p className="text-sm text-gray-600">Código: {selectedProduct.code}</p>
                    <p className="text-sm text-gray-600">
                      Estoque atual: {selectedProduct.currentStock} unidades
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade a Produzir *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = Math.max(1, formData.quantityPlanned - 1);
                    setFormData({ ...formData, quantityPlanned: newValue });
                    setErrors({ ...errors, quantityPlanned: '' });
                  }}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={formData.quantityPlanned}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setFormData({ ...formData, quantityPlanned: isNaN(value) ? 1 : Math.max(1, value) });
                    setErrors({ ...errors, quantityPlanned: '' });
                  }}
                  className={`w-32 px-3 py-3 text-center text-2xl font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantityPlanned ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, quantityPlanned: formData.quantityPlanned + 1 });
                    setErrors({ ...errors, quantityPlanned: '' });
                  }}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {/* Botões de atalho */}
              <div className="flex gap-2 mt-3">
                {[5, 10, 20, 50, 100].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, quantityPlanned: qty });
                      setErrors({ ...errors, quantityPlanned: '' });
                    }}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      formData.quantityPlanned === qty
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
              {errors.quantityPlanned && (
                <p className="mt-2 text-sm text-red-600">{errors.quantityPlanned}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Serão criadas {formData.quantityPlanned} unidades de produção no lote.
              </p>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início Prevista
                </label>
                <input
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim Prevista
                </label>
                <input
                  type="date"
                  value={formData.plannedEndDate}
                  onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações sobre o lote..."
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/production-batches')}
                className="w-full sm:w-auto px-6 py-2 min-h-[44px] border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 min-h-[44px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? 'Salvando...' : 'Criar Lote'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
