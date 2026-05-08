import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { useApproveSalesOrder } from '../hooks/useSalesOrders';
import { toast } from 'sonner';

interface ApproveSalesOrderModalProps {
  isOpen: boolean;
  orderId: string | null;
  orderNumber: string | null;
  onClose: () => void;
  onApproved?: () => void;
}

/**
 * Modal de confirmação de aprovação de pedido de venda PENDING → APPROVED.
 * Reusado pela lista (SalesOrdersPage) e pela edição (SalesOrderEditPage).
 */
export function ApproveSalesOrderModal({
  isOpen,
  orderId,
  orderNumber,
  onClose,
  onApproved,
}: ApproveSalesOrderModalProps) {
  const [notes, setNotes] = useState('');
  const approveMutation = useApproveSalesOrder();

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) setNotes('');
  }, [isOpen, orderId]);

  if (!isOpen || !orderId) return null;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        id: orderId,
        notes: notes.trim() || undefined,
      });
      toast.success(`Pedido ${orderNumber || ''} aprovado com sucesso!`.trim());
      onApproved?.();
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Erro ao aprovar pedido';
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">Aprovar pedido</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={approveMutation.isPending}
            className="text-white/80 hover:text-white disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-700">
            Você está aprovando o pedido{' '}
            <span className="font-semibold text-gray-900">{orderNumber || orderId}</span>.
          </p>
          <p className="text-xs text-gray-500">
            Após a aprovação, o pedido fica disponível para faturamento e não poderá voltar
            para o estado pendente.
          </p>

          <div>
            <label htmlFor="approve-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Observações <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="approve-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={approveMutation.isPending}
              placeholder="Ex.: confirmado com o cliente por telefone."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={approveMutation.isPending}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 min-w-[110px] justify-center"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Aprovar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
