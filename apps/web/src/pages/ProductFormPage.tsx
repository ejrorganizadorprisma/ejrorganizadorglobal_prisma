import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProduct, useCreateProduct, useUpdateProduct } from '../hooks/useProducts';
import { toast } from 'sonner';
import { BOMManager } from '../components/product/BOMManager';
import { ProductStatus } from '@ejr/shared-types';

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [activeTab, setActiveTab] = useState<'info' | 'bom'>('info');

  const { data: product, isLoading: loadingProduct } = useProduct(id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    manufacturer: '',
    costPrice: 0,
    salePrice: 0,
    technicalDescription: '',
    commercialDescription: '',
    warrantyMonths: 0,
    minimumStock: 5,
    status: ProductStatus.ACTIVE,
    isAssembly: false,
    isPart: false,
    assemblyCost: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category,
        manufacturer: product.manufacturer || '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        technicalDescription: product.technicalDescription || '',
        commercialDescription: product.commercialDescription || '',
        warrantyMonths: product.warrantyMonths || 0,
        minimumStock: product.minimumStock,
        status: product.status,
        isAssembly: product.isAssembly || false,
        isPart: product.isPart || false,
        assemblyCost: product.assemblyCost || 0,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.code || !formData.name || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.costPrice <= 0) {
      toast.error('Preço de custo deve ser maior que zero');
      return;
    }

    if (formData.salePrice <= 0) {
      toast.error('Preço de venda deve ser maior que zero');
      return;
    }

    if (formData.salePrice < formData.costPrice) {
      toast.error('Preço de venda não pode ser menor que o preço de custo');
      return;
    }

    if (formData.minimumStock < 0) {
      toast.error('Estoque mínimo não pode ser negativo');
      return;
    }

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({
          id: id!,
          data: formData,
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        await createProduct.mutateAsync(formData);
        toast.success('Produto criado com sucesso!');
      }
      navigate('/products');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar produto');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'costPrice' || name === 'salePrice' || name === 'assemblyCost') {
      // Converte para centavos
      const numValue = parseFloat(value) || 0;
      setFormData((prev) => ({ ...prev, [name]: Math.round(numValue * 100) }));
    } else if (name === 'minimumStock' || name === 'warrantyMonths') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <button
            onClick={() => navigate('/products')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar para Produtos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
        </div>

        {/* Tabs */}
        {isEditing && formData.isAssembly && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Informações Básicas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bom')}
                className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'bom'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                BOM (Peças)
              </button>
            </nav>
          </div>
        )}

        {activeTab === 'info' ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PROD-001"
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do produto"
            />
          </div>

          {/* Fabricante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabricante
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do fabricante"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informática, Periféricos..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ProductStatus.ACTIVE}>Ativo</option>
              <option value={ProductStatus.INACTIVE}>Inativo</option>
              <option value={ProductStatus.DISCONTINUED}>Descontinuado</option>
            </select>
          </div>

          {/* Garantia (meses) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garantia (meses)
            </label>
            <input
              type="number"
              name="warrantyMonths"
              value={formData.warrantyMonths}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          {/* Preço de Custo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço de Custo (R$)
            </label>
            <input
              type="number"
              name="costPrice"
              value={(formData.costPrice / 100).toFixed(2)}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Preço de Venda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preço de Venda (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="salePrice"
              value={(formData.salePrice / 100).toFixed(2)}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Estoque Mínimo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque Mínimo
            </label>
            <input
              type="number"
              name="minimumStock"
              value={formData.minimumStock}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>

          {/* Tipo de Produto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Produto
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAssembly"
                  checked={formData.isAssembly}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  É produto montado? (possui BOM)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPart"
                  checked={formData.isPart}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  É peça/componente?
                </span>
              </label>
            </div>
          </div>

          {/* Custo de Montagem (se isAssembly) */}
          {formData.isAssembly && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo de Montagem (R$)
              </label>
              <input
                type="number"
                name="assemblyCost"
                value={(formData.assemblyCost / 100).toFixed(2)}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Custo adicional para montar este produto
              </p>
            </div>
          )}

          {/* Descrição Técnica */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Técnica
            </label>
            <textarea
              name="technicalDescription"
              value={formData.technicalDescription}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Especificações técnicas detalhadas..."
            />
          </div>

          {/* Descrição Comercial */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Comercial
            </label>
            <textarea
              name="commercialDescription"
              value={formData.commercialDescription}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição para vendas e marketing..."
            />
          </div>
            </div>

            {/* Botões */}
            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={createProduct.isPending || updateProduct.isPending}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createProduct.isPending || updateProduct.isPending
                  ? 'Salvando...'
                  : isEditing
                  ? 'Atualizar'
                  : 'Criar Produto'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            {id && <BOMManager productId={id} />}
          </div>
        )}
      </div>
    </div>
  );
}
