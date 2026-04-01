import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  Scissors,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import {
  useCreateDigitalFabricationBatch,
  useCreateFabricationItem,
  useFabricationMachines,
} from '../hooks/useDigitalFabrication';
import { useUsers } from '../hooks/useUsers';
import { useProducts } from '../hooks/useProducts';
import {
  FabricationMachineType,
  MaterialType,
  MaterialUnit,
  MaterialTypeLabels,
  MaterialUnitLabels,
  CreateDigitalFabricationItemDTO,
} from '@ejr/shared-types';
import { toast } from 'sonner';

interface ItemForm {
  itemName: string;
  productId?: string;
  fileName?: string;
  quantityPlanned: number;
  materialType: MaterialType;
  materialProductId?: string;
  materialPlanned: number;
  materialUnit: MaterialUnit;
  cutWidth?: number;
  cutHeight?: number;
  printTimeMinutes?: number;
}

const defaultItem3D: ItemForm = {
  itemName: '',
  quantityPlanned: 1,
  materialType: MaterialType.PLA,
  materialPlanned: 0,
  materialUnit: MaterialUnit.GRAMS,
};

const defaultItemLaser: ItemForm = {
  itemName: '',
  quantityPlanned: 1,
  materialType: MaterialType.MDF_3MM,
  materialPlanned: 0,
  materialUnit: MaterialUnit.CM_SQ,
};

// Filtra materiais por tipo de máquina
const filamentTypes = [
  MaterialType.PLA,
  MaterialType.ABS,
  MaterialType.PETG,
  MaterialType.TPU,
  MaterialType.NYLON,
  MaterialType.ASA,
  MaterialType.PC,
  MaterialType.PVA,
  MaterialType.HIPS,
  MaterialType.WOOD,
  MaterialType.CARBON_FIBER,
  MaterialType.OTHER_FILAMENT,
];

const laserMaterials = [
  MaterialType.MDF_3MM,
  MaterialType.MDF_6MM,
  MaterialType.MDF_9MM,
  MaterialType.MDF_12MM,
  MaterialType.MDF_15MM,
  MaterialType.ACRYLIC_2MM,
  MaterialType.ACRYLIC_3MM,
  MaterialType.ACRYLIC_5MM,
  MaterialType.ACRYLIC_10MM,
  MaterialType.PLYWOOD_3MM,
  MaterialType.PLYWOOD_6MM,
  MaterialType.CARDBOARD,
  MaterialType.LEATHER,
  MaterialType.FABRIC,
  MaterialType.PAPER,
  MaterialType.EVA,
  MaterialType.CORK,
  MaterialType.OTHER_LASER,
];

export function DigitalFabricationNewPage() {
  const navigate = useNavigate();
  const [machineType, setMachineType] = useState<FabricationMachineType>('PRINTER_3D');
  const [machineId, setMachineId] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<ItemForm[]>([
    { ...defaultItem3D },
  ]);
  const [saving, setSaving] = useState(false);

  const { data: machines } = useFabricationMachines({ type: machineType, isActive: true });
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: productsData } = useProducts({ limit: 500 });

  const createBatch = useCreateDigitalFabricationBatch();
  const createItem = useCreateFabricationItem();

  const users = usersData?.data || [];
  const products = productsData?.data || [];

  // Filtrar produtos que podem ser material (filamento, MDF, etc)
  const materialProducts = products.filter(p =>
    p.name.toLowerCase().includes('filament') ||
    p.name.toLowerCase().includes('pla') ||
    p.name.toLowerCase().includes('abs') ||
    p.name.toLowerCase().includes('petg') ||
    p.name.toLowerCase().includes('mdf') ||
    p.name.toLowerCase().includes('acril') ||
    p.name.toLowerCase().includes('madeira') ||
    p.name.toLowerCase().includes('compensado') ||
    p.type === 'RAW_MATERIAL'
  );

  const handleMachineTypeChange = (type: FabricationMachineType) => {
    setMachineType(type);
    setMachineId('');
    // Reset items para o novo tipo
    setItems([type === 'PRINTER_3D' ? { ...defaultItem3D } : { ...defaultItemLaser }]);
  };

  const addItem = () => {
    const newItem = machineType === 'PRINTER_3D' ? { ...defaultItem3D } : { ...defaultItemLaser };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('O lote deve ter pelo menos um item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Se mudou dimensões do laser, calcular área automaticamente
    if (machineType === 'LASER_CUTTER' && (field === 'cutWidth' || field === 'cutHeight')) {
      const item = newItems[index];
      if (item.cutWidth && item.cutHeight) {
        // Área em cm²
        item.materialPlanned = (item.cutWidth / 10) * (item.cutHeight / 10);
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao lote');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemName.trim()) {
        toast.error(`Item ${i + 1}: Nome é obrigatório`);
        return;
      }
      if (items[i].quantityPlanned < 1) {
        toast.error(`Item ${i + 1}: Quantidade deve ser pelo menos 1`);
        return;
      }
    }

    setSaving(true);

    try {
      // 1. Criar o lote
      const batch = await createBatch.mutateAsync({
        machineType,
        machineId: machineId || undefined,
        operatorId: operatorId || undefined,
        plannedDate: plannedDate || undefined,
        notes: notes || undefined,
      });

      // 2. Criar os itens
      for (const item of items) {
        const itemDTO: CreateDigitalFabricationItemDTO = {
          batchId: batch.id,
          itemName: item.itemName,
          productId: item.productId || undefined,
          fileName: item.fileName || undefined,
          quantityPlanned: item.quantityPlanned,
          materialType: item.materialType,
          materialProductId: item.materialProductId || undefined,
          materialPlanned: item.materialPlanned,
          materialUnit: item.materialUnit,
          cutWidth: item.cutWidth || undefined,
          cutHeight: item.cutHeight || undefined,
          printTimeMinutes: item.printTimeMinutes || undefined,
        };

        await createItem.mutateAsync(itemDTO);
      }

      toast.success('Lote criado com sucesso!');
      navigate(`/digital-fabrication/${batch.id}`);
    } catch (error: any) {
      console.error('Erro ao criar lote:', error);
      toast.error(error.response?.data?.error?.message || 'Erro ao criar lote');
    } finally {
      setSaving(false);
    }
  };

  const availableMaterials = machineType === 'PRINTER_3D' ? filamentTypes : laserMaterials;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Novo Lote de Fabricacao</h1>
          <p className="text-gray-600">Configure um novo lote de impressao 3D ou corte laser</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Máquina */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Tipo de Fabricacao</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleMachineTypeChange('PRINTER_3D')}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                machineType === 'PRINTER_3D'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`p-3 rounded-lg ${machineType === 'PRINTER_3D' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <Printer className={`w-8 h-8 ${machineType === 'PRINTER_3D' ? 'text-purple-600' : 'text-gray-400'}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold">Impressora 3D</p>
                <p className="text-sm text-gray-500">Filamento medido em gramas</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleMachineTypeChange('LASER_CUTTER')}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                machineType === 'LASER_CUTTER'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`p-3 rounded-lg ${machineType === 'LASER_CUTTER' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Scissors className={`w-8 h-8 ${machineType === 'LASER_CUTTER' ? 'text-orange-600' : 'text-gray-400'}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold">Cortadora Laser</p>
                <p className="text-sm text-gray-500">Area medida em cm²</p>
              </div>
            </button>
          </div>
        </div>

        {/* Configurações do Lote */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">Configuracoes do Lote</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maquina
              </label>
              <select
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione uma máquina</option>
                {machines?.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} {machine.model && `(${machine.model})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operador
              </label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione um operador</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Planejada
              </label>
              <input
                type="datetime-local"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observacoes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Observações sobre o lote..."
            />
          </div>
        </div>

        {/* Itens do Lote */}
        <div className="bg-white rounded-lg shadow p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Itens do Lote</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-700">Item {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Nome do Item */}
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Nome/Descricao *</label>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="Ex: Suporte para celular"
                      required
                    />
                  </div>

                  {/* Quantidade */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantidade *</label>
                    <input
                      type="number"
                      value={item.quantityPlanned}
                      onChange={(e) => updateItem(index, 'quantityPlanned', parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Arquivo */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Arquivo</label>
                    <input
                      type="text"
                      value={item.fileName || ''}
                      onChange={(e) => updateItem(index, 'fileName', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder={machineType === 'PRINTER_3D' ? 'arquivo.stl' : 'arquivo.dxf'}
                    />
                  </div>

                  {/* Tipo de Material */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Tipo de Material</label>
                    <select
                      value={item.materialType}
                      onChange={(e) => updateItem(index, 'materialType', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      {availableMaterials.map((mat) => (
                        <option key={mat} value={mat}>{MaterialTypeLabels[mat]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Material do Estoque */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Material (Estoque)</label>
                    <select
                      value={item.materialProductId || ''}
                      onChange={(e) => updateItem(index, 'materialProductId', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Selecionar do estoque</option>
                      {materialProducts.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} (Est: {prod.currentStock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {machineType === 'PRINTER_3D' ? (
                    <>
                      {/* Material Planejado (gramas) */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Material (g/unidade)</label>
                        <input
                          type="number"
                          value={item.materialPlanned}
                          onChange={(e) => updateItem(index, 'materialPlanned', parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.1}
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="Gramas por unidade"
                        />
                      </div>

                      {/* Tempo de Impressão */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tempo (min/unidade)</label>
                        <input
                          type="number"
                          value={item.printTimeMinutes || ''}
                          onChange={(e) => updateItem(index, 'printTimeMinutes', parseInt(e.target.value) || undefined)}
                          min={0}
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="Minutos"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Largura de Corte */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Largura (mm)</label>
                        <input
                          type="number"
                          value={item.cutWidth || ''}
                          onChange={(e) => updateItem(index, 'cutWidth', parseFloat(e.target.value) || undefined)}
                          min={0}
                          step={0.1}
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="mm"
                        />
                      </div>

                      {/* Altura de Corte */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Altura (mm)</label>
                        <input
                          type="number"
                          value={item.cutHeight || ''}
                          onChange={(e) => updateItem(index, 'cutHeight', parseFloat(e.target.value) || undefined)}
                          min={0}
                          step={0.1}
                          className="w-full border rounded px-3 py-2 text-sm"
                          placeholder="mm"
                        />
                      </div>

                      {/* Área calculada */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Area (cm²)</label>
                        <input
                          type="number"
                          value={item.materialPlanned.toFixed(2)}
                          readOnly
                          className="w-full border rounded px-3 py-2 text-sm bg-gray-100"
                        />
                      </div>
                    </>
                  )}

                  {/* Produto Final (opcional) */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Produto Final</label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Sem vincular produto</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.code} - {prod.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum item adicionado</p>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Adicionar primeiro item
              </button>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-4 py-2 min-h-[44px] border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Criar Lote'}
          </button>
        </div>
      </form>
    </div>
  );
}
