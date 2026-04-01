import { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
} from '../hooks/useProductCategories';
import {
  useProductFamilies,
  useCreateProductFamily,
  useUpdateProductFamily,
  useDeleteProductFamily,
} from '../hooks/useProductFamilies';
import { usePagePermissions } from '../hooks/usePagePermissions';
import type { ProductCategory, ProductFamily } from '@ejr/shared-types';

type TabType = 'categories' | 'families';

export function ProductCategoriesPage() {
  // Verificação de permissões - deve vir antes de qualquer return condicional
  const { hasActionPermission } = usePagePermissions();
  const canCreate = hasActionPermission('products' as any, 'create' as any);
  const canEdit = hasActionPermission('products' as any, 'edit' as any);
  const canDelete = hasActionPermission('products' as any, 'delete' as any);
  const canModify = canCreate || canEdit || canDelete;

  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  // Categories
  const { data: categories = [], isLoading: loadingCategories } = useProductCategories();
  const createCategoryMutation = useCreateProductCategory();
  const updateCategoryMutation = useUpdateProductCategory();
  const deleteCategoryMutation = useDeleteProductCategory();

  // Families
  const { data: families = [], isLoading: loadingFamilies } = useProductFamilies();
  const createFamilyMutation = useCreateProductFamily();
  const updateFamilyMutation = useUpdateProductFamily();
  const deleteFamilyMutation = useDeleteProductFamily();

  const openCategoryDialog = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const openFamilyDialog = (family?: ProductFamily) => {
    if (family) {
      setEditingFamily(family);
      setFormData({
        name: family.name,
        description: family.description || '',
        isActive: family.isActive,
      });
    } else {
      setEditingFamily(null);
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setEditingFamily(null);
    setFormData({
      name: '',
      description: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (activeTab === 'categories') {
        if (editingCategory) {
          await updateCategoryMutation.mutateAsync({
            id: editingCategory.id,
            data: {
              name: formData.name,
              description: formData.description || null,
              isActive: formData.isActive,
            },
          });
          toast.success('Categoria atualizada com sucesso!');
        } else {
          await createCategoryMutation.mutateAsync({
            name: formData.name,
            description: formData.description || undefined,
            isActive: formData.isActive,
          });
          toast.success('Categoria criada com sucesso!');
        }
      } else {
        if (editingFamily) {
          await updateFamilyMutation.mutateAsync({
            id: editingFamily.id,
            data: {
              name: formData.name,
              description: formData.description || null,
              isActive: formData.isActive,
            },
          });
          toast.success('Família atualizada com sucesso!');
        } else {
          await createFamilyMutation.mutateAsync({
            name: formData.name,
            description: formData.description || undefined,
            isActive: formData.isActive,
          });
          toast.success('Família criada com sucesso!');
        }
      }
      closeDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    }
  };

  const handleDeleteCategory = async (category: ProductCategory) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync(category.id);
      toast.success('Categoria excluída com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir categoria');
    }
  };

  const handleDeleteFamily = async (family: ProductFamily) => {
    if (!confirm(`Tem certeza que deseja excluir a família "${family.name}"?`)) {
      return;
    }

    try {
      await deleteFamilyMutation.mutateAsync(family.id);
      toast.success('Família excluída com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir família');
    }
  };

  const isLoading = loadingCategories || loadingFamilies;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Categorias e Famílias</h1>
          <p className="text-gray-600 mt-1">{canModify ? 'Gerencie' : 'Visualize'} as categorias e famílias de produtos</p>
        </div>
        {canCreate && (
          <button
            onClick={() => activeTab === 'categories' ? openCategoryDialog() : openFamilyDialog()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'categories' ? 'Nova Categoria' : 'Nova Família'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('categories')}
              className={`${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Tag className="w-4 h-4" />
              Categorias ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('families')}
              className={`${
                activeTab === 'families'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Layers className="w-4 h-4" />
              Famílias ({families.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Tabela de Categorias */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canModify && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Tag className="w-5 h-5 text-blue-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{category.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {category.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canModify && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canEdit && (
                        <button
                          onClick={() => openCategoryDialog(category)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma categoria cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Tabela de Famílias */}
      {activeTab === 'families' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canModify && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {families.map((family) => (
                <tr key={family.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Layers className="w-5 h-5 text-purple-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{family.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{family.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        family.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {family.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canModify && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canEdit && (
                        <button
                          onClick={() => openFamilyDialog(family)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteFamily(family)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {families.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma família cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Dialog Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {activeTab === 'categories'
                  ? editingCategory ? 'Editar Categoria' : 'Nova Categoria'
                  : editingFamily ? 'Editar Família' : 'Nova Família'}
              </h2>
              <button onClick={closeDialog} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={activeTab === 'categories' ? 'Ex: Informática, Periféricos...' : 'Ex: Linha Premium, Linha Econômica...'}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descrição opcional"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createCategoryMutation.isPending || updateCategoryMutation.isPending ||
                    createFamilyMutation.isPending || updateFamilyMutation.isPending
                  }
                  className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending ||
                    createFamilyMutation.isPending || updateFamilyMutation.isPending)
                    ? 'Salvando...'
                    : (editingCategory || editingFamily)
                    ? 'Atualizar'
                    : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCategoriesPage;
