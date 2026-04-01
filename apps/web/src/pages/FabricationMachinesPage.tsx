import { useState } from 'react';
import { Plus, Printer, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import {
  useFabricationMachines,
  useCreateFabricationMachine,
  useUpdateFabricationMachine,
  useDeleteFabricationMachine,
} from '../hooks/useDigitalFabrication';
import type {
  FabricationMachine,
  FabricationMachineType,
  CreateFabricationMachineDTO,
} from '@ejr/shared-types';

const machineTypeLabels: Record<FabricationMachineType, string> = {
  PRINTER_3D: 'Impressora 3D',
  LASER_CUTTER: 'Cortadora Laser',
};

export function FabricationMachinesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<FabricationMachine | null>(null);
  const [formData, setFormData] = useState<Partial<CreateFabricationMachineDTO>>({
    type: 'PRINTER_3D',
    isActive: true,
  });

  const { data: machines, isLoading } = useFabricationMachines();
  const createMachine = useCreateFabricationMachine();
  const updateMachine = useUpdateFabricationMachine();
  const deleteMachine = useDeleteFabricationMachine();

  const openCreateModal = () => {
    setEditingMachine(null);
    setFormData({
      type: 'PRINTER_3D',
      isActive: true,
      name: '',
      brand: '',
      model: '',
      buildVolumeX: undefined,
      buildVolumeY: undefined,
      buildVolumeZ: undefined,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (machine: FabricationMachine) => {
    setEditingMachine(machine);
    setFormData({
      type: machine.type,
      name: machine.name,
      brand: machine.brand || '',
      model: machine.model || '',
      buildVolumeX: machine.buildVolumeX || undefined,
      buildVolumeY: machine.buildVolumeY || undefined,
      buildVolumeZ: machine.buildVolumeZ || undefined,
      isActive: machine.isActive,
      notes: machine.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) return;

    try {
      if (editingMachine) {
        await updateMachine.mutateAsync({
          id: editingMachine.id,
          dto: formData,
        });
      } else {
        await createMachine.mutateAsync(formData as CreateFabricationMachineDTO);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar máquina:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta máquina?')) return;

    try {
      await deleteMachine.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir máquina:', error);
    }
  };

  const handleToggleActive = async (machine: FabricationMachine) => {
    try {
      await updateMachine.mutateAsync({
        id: machine.id,
        dto: { isActive: !machine.isActive },
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Máquinas de Fabricação</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas impressoras 3D e cortadoras laser
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Máquina
        </button>
      </div>

      {/* Lista de Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines?.map((machine) => (
          <div
            key={machine.id}
            className={`bg-white rounded-lg shadow-sm border p-4 lg:p-6 ${
              !machine.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  machine.type === 'PRINTER_3D'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{machine.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    machine.type === 'PRINTER_3D'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {machineTypeLabels[machine.type]}
                  </span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                machine.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {machine.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>

            {(machine.brand || machine.model) && (
              <div className="text-sm text-gray-600 mb-3">
                {machine.brand && <span>{machine.brand}</span>}
                {machine.brand && machine.model && <span> - </span>}
                {machine.model && <span>{machine.model}</span>}
              </div>
            )}

            {(machine.buildVolumeX || machine.buildVolumeY || machine.buildVolumeZ) && (
              <div className="text-sm text-gray-500 mb-3">
                <span className="font-medium">Volume: </span>
                {machine.buildVolumeX || '-'} x {machine.buildVolumeY || '-'}
                {machine.type === 'PRINTER_3D' && ` x ${machine.buildVolumeZ || '-'}`} mm
              </div>
            )}

            {machine.notes && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{machine.notes}</p>
            )}

            <div className="flex items-center gap-2 pt-4 border-t">
              <button
                onClick={() => handleToggleActive(machine)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  machine.isActive
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {machine.isActive ? (
                  <>
                    <PowerOff className="w-4 h-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Ativar
                  </>
                )}
              </button>
              <button
                onClick={() => openEditModal(machine)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(machine.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {machines?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma máquina cadastrada
          </h3>
          <p className="text-gray-600 mb-4">
            Adicione sua primeira impressora 3D ou cortadora laser
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Máquina
          </button>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Máquina *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as FabricationMachineType })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="PRINTER_3D">Impressora 3D</option>
                  <option value="LASER_CUTTER">Cortadora Laser</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Máquina *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ender 3 Pro"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Creality"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: V2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume de Construção (mm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      value={formData.buildVolumeX || ''}
                      onChange={(e) => setFormData({ ...formData, buildVolumeX: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="X (largura)"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-500">Largura</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={formData.buildVolumeY || ''}
                      onChange={(e) => setFormData({ ...formData, buildVolumeY: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Y (profund.)"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-500">Profundidade</span>
                  </div>
                  {formData.type === 'PRINTER_3D' && (
                    <div>
                      <input
                        type="number"
                        value={formData.buildVolumeZ || ''}
                        onChange={(e) => setFormData({ ...formData, buildVolumeZ: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Z (altura)"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-500">Altura</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre a máquina..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Máquina ativa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMachine.isPending || updateMachine.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createMachine.isPending || updateMachine.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
