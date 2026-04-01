import { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, Box, Grid, X } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { AppPage } from '@ejr/shared-types';
import type { StorageSpace, StorageShelf, StorageSection } from '@ejr/shared-types';

type TabType = 'spaces' | 'shelves' | 'sections';

export default function StorageLocationsPage() {
  // Todos os hooks devem ser chamados ANTES de qualquer return condicional
  const { hasActionPermission } = usePagePermissions();
  const canCreate = hasActionPermission('storage_locations' as any, 'create' as any);
  const canEdit = hasActionPermission('storage_locations' as any, 'edit' as any);
  const canDelete = hasActionPermission('storage_locations' as any, 'delete' as any);
  const canModify = canCreate || canEdit || canDelete;

  const [activeTab, setActiveTab] = useState<TabType>('spaces');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const queryClient = useQueryClient();

  // Queries
  const { data: spaces = [] } = useQuery({
    queryKey: ['storage-spaces'],
    queryFn: async () => {
      const res = await api.get('/storage-locations/spaces');
      return res.data.data as StorageSpace[];
    },
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['storage-shelves'],
    queryFn: async () => {
      const res = await api.get('/storage-locations/shelves');
      return res.data.data as StorageShelf[];
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['storage-sections'],
    queryFn: async () => {
      const res = await api.get('/storage-locations/sections');
      return res.data.data as StorageSection[];
    },
  });

  // Space Mutations
  const createSpaceMutation = useMutation({
    mutationFn: (data: any) => api.post('/storage-locations/spaces', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-spaces'] });
      toast.success('Espaço criado com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar espaço'),
  });

  const updateSpaceMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/storage-locations/spaces/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-spaces'] });
      toast.success('Espaço atualizado com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar espaço'),
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/storage-locations/spaces/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-spaces'] });
      toast.success('Espaço deletado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao deletar espaço');
    },
  });

  // Shelf Mutations
  const createShelfMutation = useMutation({
    mutationFn: (data: any) => api.post('/storage-locations/shelves', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
      toast.success('Prateleira criada com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar prateleira'),
  });

  const updateShelfMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/storage-locations/shelves/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
      toast.success('Prateleira atualizada com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar prateleira'),
  });

  const deleteShelfMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/storage-locations/shelves/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
      toast.success('Prateleira deletada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao deletar prateleira');
    },
  });

  // Section Mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: any) => api.post('/storage-locations/sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-sections'] });
      toast.success('Seção criada com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar seção'),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/storage-locations/sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-sections'] });
      toast.success('Seção atualizada com sucesso!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar seção'),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/storage-locations/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-sections'] });
      toast.success('Seção deletada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Erro ao deletar seção');
    },
  });

  // Verificação de permissão (deve vir depois de todos os hooks)
  const permissionCheck = useRequirePermission({
    page: AppPage.STORAGE_LOCATIONS,
    message: 'Você não tem permissão para acessar a página de localização de estoque.'
  });
  if (permissionCheck) return permissionCheck;

  const openDialog = (type: TabType, item?: any) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
        ...(type === 'shelves' && { spaceId: '' }),
        ...(type === 'sections' && { shelfId: '' }),
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'spaces') {
      if (editingItem) {
        updateSpaceMutation.mutate({ id: editingItem.id, data: formData });
      } else {
        createSpaceMutation.mutate(formData);
      }
    } else if (activeTab === 'shelves') {
      if (editingItem) {
        updateShelfMutation.mutate({ id: editingItem.id, data: formData });
      } else {
        createShelfMutation.mutate(formData);
      }
    } else if (activeTab === 'sections') {
      if (editingItem) {
        updateSectionMutation.mutate({ id: editingItem.id, data: formData });
      } else {
        createSectionMutation.mutate(formData);
      }
    }
  };

  const handleDelete = (type: TabType, id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;

    if (type === 'spaces') {
      deleteSpaceMutation.mutate(id);
    } else if (type === 'shelves') {
      deleteShelfMutation.mutate(id);
    } else if (type === 'sections') {
      deleteSectionMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Localização de Estoque</h1>
          <p className="text-gray-600 mt-1">{canModify ? 'Gerencie' : 'Visualize'} espaços, prateleiras e seções</p>
        </div>
        {canCreate && (
          <button
            onClick={() => openDialog(activeTab)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo {activeTab === 'spaces' ? 'Espaço' : activeTab === 'shelves' ? 'Prateleira' : 'Seção'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-4 sm:gap-0 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('spaces')}
              className={`${
                activeTab === 'spaces'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <MapPin className="w-4 h-4" />
              Espaços ({spaces.length})
            </button>
            <button
              onClick={() => setActiveTab('shelves')}
              className={`${
                activeTab === 'shelves'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Box className="w-4 h-4" />
              Prateleiras ({shelves.length})
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`${
                activeTab === 'sections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <Grid className="w-4 h-4" />
              Seções ({sections.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Spaces Table */}
      {activeTab === 'spaces' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
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
              {spaces.map((space) => (
                <tr key={space.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 text-blue-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{space.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{space.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        space.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {space.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canModify && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canEdit && (
                        <button
                          onClick={() => openDialog('spaces', space)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete('spaces', space.id, space.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {spaces.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                    Nenhum espaço cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Shelves Table */}
      {activeTab === 'shelves' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Espaço
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
              {shelves.map((shelf) => {
                const space = spaces.find((s) => s.id === shelf.spaceId);
                return (
                  <tr key={shelf.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Box className="w-5 h-5 text-blue-500 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{shelf.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{space?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{shelf.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          shelf.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {shelf.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {canModify && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canEdit && (
                          <button
                            onClick={() => openDialog('shelves', shelf)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete('shelves', shelf.id, shelf.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {shelves.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma prateleira cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sections Table */}
      {activeTab === 'sections' && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prateleira
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Espaço
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
              {sections.map((section) => {
                const shelf = shelves.find((s) => s.id === section.shelfId);
                const space = shelf ? spaces.find((s) => s.id === shelf.spaceId) : null;
                return (
                  <tr key={section.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Grid className="w-5 h-5 text-blue-500 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{section.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{shelf?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{space?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{section.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          section.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {section.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {canModify && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canEdit && (
                          <button
                            onClick={() => openDialog('sections', section)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete('sections', section.id, section.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={canModify ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma seção cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Editar' : 'Novo'}{' '}
                {activeTab === 'spaces' ? 'Espaço' : activeTab === 'shelves' ? 'Prateleira' : 'Seção'}
              </h2>
              <button onClick={closeDialog} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Space Form */}
              {activeTab === 'spaces' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Depósito 1"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description || ''}
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
                        checked={formData.isActive ?? true}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Ativo</span>
                    </label>
                  </div>
                </>
              )}

              {/* Shelf Form */}
              {activeTab === 'shelves' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Espaço *
                    </label>
                    <select
                      required
                      value={formData.spaceId || ''}
                      onChange={(e) => setFormData({ ...formData, spaceId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um espaço</option>
                      {spaces
                        .filter((s) => s.isActive)
                        .map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1A"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description || ''}
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
                        checked={formData.isActive ?? true}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Ativo</span>
                    </label>
                  </div>
                </>
              )}

              {/* Section Form */}
              {activeTab === 'sections' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prateleira *
                    </label>
                    <select
                      required
                      value={formData.shelfId || ''}
                      onChange={(e) => setFormData({ ...formData, shelfId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma prateleira</option>
                      {shelves
                        .filter((s) => s.isActive)
                        .map((shelf) => {
                          const space = spaces.find((sp) => sp.id === shelf.spaceId);
                          return (
                            <option key={shelf.id} value={shelf.id}>
                              {space?.name} - {shelf.name}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description || ''}
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
                        checked={formData.isActive ?? true}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Ativo</span>
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingItem ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
