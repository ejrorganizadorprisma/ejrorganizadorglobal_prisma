import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateProductionReport } from '../../hooks/useProductionOrders';

interface ProductionReportingFormProps {
  productionOrderId: string;
  onClose: () => void;
}

export function ProductionReportingForm({
  productionOrderId,
  onClose,
}: ProductionReportingFormProps) {
  const createReportMutation = useCreateProductionReport();

  const [formData, setFormData] = useState({
    quantityProduced: 0,
    quantityScrapped: 0,
    scrapReason: '',
    reportedBy: '',
    shift: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.quantityProduced <= 0 && formData.quantityScrapped <= 0) {
      toast.error('Informe a quantidade produzida ou refugada');
      return;
    }

    if (formData.quantityScrapped > 0 && !formData.scrapReason.trim()) {
      toast.error('Informe o motivo do refugo');
      return;
    }

    try {
      await createReportMutation.mutateAsync({
        productionOrderId,
        quantityProduced: formData.quantityProduced,
        quantityScrapped: formData.quantityScrapped || undefined,
        scrapReason: formData.scrapReason.trim() || undefined,
        reportedBy: formData.reportedBy.trim() || undefined,
        shift: formData.shift || undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success('Apontamento de produção registrado com sucesso');
      onClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message ||
          'Erro ao registrar apontamento de produção'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Apontamento de Produção
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Quantities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Produzida <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantityProduced}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityProduced: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  required={formData.quantityScrapped === 0}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Quantidade de peças boas produzidas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade de Refugo
                </label>
                <input
                  type="number"
                  value={formData.quantityScrapped}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityScrapped: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Quantidade de peças refugadas/rejeitadas
                </p>
              </div>
            </div>

            {/* Scrap Reason - Only show if scrapped > 0 */}
            {formData.quantityScrapped > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo do Refugo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.scrapReason}
                  onChange={(e) =>
                    setFormData({ ...formData, scrapReason: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o motivo</option>
                  <option value="MATERIAL_DEFECT">Defeito no Material</option>
                  <option value="PROCESS_ERROR">Erro no Processo</option>
                  <option value="EQUIPMENT_FAILURE">Falha no Equipamento</option>
                  <option value="DIMENSIONAL_ERROR">Erro Dimensional</option>
                  <option value="QUALITY_ISSUE">Problema de Qualidade</option>
                  <option value="OPERATOR_ERROR">Erro do Operador</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
            )}

            {/* Reporter and Shift */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reportado por
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) =>
                    setFormData({ ...formData, reportedBy: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do operador/responsável"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turno
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) =>
                    setFormData({ ...formData, shift: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o turno</option>
                  <option value="MORNING">Manhã</option>
                  <option value="AFTERNOON">Tarde</option>
                  <option value="NIGHT">Noite</option>
                  <option value="FIRST">1º Turno</option>
                  <option value="SECOND">2º Turno</option>
                  <option value="THIRD">3º Turno</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações sobre a produção, problemas encontrados, etc."
              />
            </div>

            {/* Summary */}
            {(formData.quantityProduced > 0 || formData.quantityScrapped > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Resumo do Apontamento
                </h3>
                <div className="space-y-1 text-sm text-blue-800">
                  {formData.quantityProduced > 0 && (
                    <p>
                      Produzido:{' '}
                      <span className="font-semibold">
                        {formData.quantityProduced} unidade(s)
                      </span>
                    </p>
                  )}
                  {formData.quantityScrapped > 0 && (
                    <p>
                      Refugo:{' '}
                      <span className="font-semibold">
                        {formData.quantityScrapped} unidade(s)
                      </span>
                    </p>
                  )}
                  <p>
                    Total registrado:{' '}
                    <span className="font-semibold">
                      {formData.quantityProduced + formData.quantityScrapped}{' '}
                      unidade(s)
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={createReportMutation.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createReportMutation.isPending}
            >
              <Save className="w-4 h-4" />
              {createReportMutation.isPending
                ? 'Registrando...'
                : 'Registrar Apontamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
