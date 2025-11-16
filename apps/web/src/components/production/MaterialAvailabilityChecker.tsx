import { CheckCircle, AlertTriangle, Package } from 'lucide-react';
import type { MaterialConsumption } from '../../hooks/useProductionOrders';

interface MaterialAvailabilityCheckerProps {
  materials: MaterialConsumption[];
  quantityNeeded: number;
}

export function MaterialAvailabilityChecker({
  materials,
  quantityNeeded,
}: MaterialAvailabilityCheckerProps) {
  const checkAvailability = (material: MaterialConsumption) => {
    const totalRequired = material.quantityPlanned * quantityNeeded;
    const available = material.product?.currentStock || 0;
    return {
      required: totalRequired,
      available,
      hasStock: available >= totalRequired,
      shortage: Math.max(0, totalRequired - available),
    };
  };

  const allMaterialsAvailable = materials.every((m) => {
    const check = checkAvailability(m);
    return check.hasStock;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Verificação de Materiais
        </h3>
        {allMaterialsAvailable ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Todos disponíveis</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Materiais faltando</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {materials.map((material) => {
          const availability = checkAvailability(material);

          return (
            <div
              key={material.id}
              className={`border rounded-lg p-4 ${
                availability.hasStock
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {material.product?.name || 'Material'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {material.product?.code || '-'}
                    </p>
                  </div>
                </div>
                {availability.hasStock ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-gray-600">Necessário</p>
                  <p className="font-semibold text-gray-900">
                    {availability.required}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Disponível</p>
                  <p
                    className={`font-semibold ${
                      availability.hasStock ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {availability.available}
                  </p>
                </div>
                {!availability.hasStock && (
                  <div>
                    <p className="text-gray-600">Faltando</p>
                    <p className="font-semibold text-red-600">
                      {availability.shortage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!allMaterialsAvailable && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Alguns materiais estão em falta. Você pode
            salvar esta ordem como rascunho e aguardar a reposição de estoque, ou
            ajustar a quantidade planejada.
          </p>
        </div>
      )}
    </div>
  );
}
