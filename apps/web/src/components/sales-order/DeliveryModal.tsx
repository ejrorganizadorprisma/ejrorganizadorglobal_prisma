import { useState } from 'react';
import { useMarkDeliveredSalesOrder } from '../../hooks/useSalesOrders';
import { toast } from 'sonner';
import { X, Truck, User, Building2 } from 'lucide-react';

interface DeliveryModalProps {
  orderId: string;
  orderNumber?: string;
  onClose: () => void;
  onDone: () => void;
}

export function DeliveryModal({ orderId, orderNumber, onClose, onDone }: DeliveryModalProps) {
  const markDelivered = useMarkDeliveredSalesOrder();
  const [type, setType] = useState<'CUSTOMER' | 'CARRIER'>('CUSTOMER');
  const [carrierName, setCarrierName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (type === 'CARRIER' && !carrierName.trim()) { toast.error('Informe o nome da transportadora.'); return; }
    setSaving(true);
    try {
      await markDelivered.mutateAsync({ id: orderId, body: { deliveryType: type, carrierName: type === 'CARRIER' ? carrierName : undefined } });
      toast.success('Venda marcada como entregue!');
      onDone();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Erro ao marcar entrega.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-lime-600 to-lime-500 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Truck className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">Registrar Entrega</h3>
            {orderNumber && <p className="text-xs text-lime-50/90">{orderNumber}</p>}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setType('CUSTOMER')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 ${type === 'CUSTOMER' ? 'border-lime-500 bg-lime-50' : 'border-slate-200'}`}>
              <User className={`w-6 h-6 ${type === 'CUSTOMER' ? 'text-lime-600' : 'text-slate-400'}`} />
              <span className="text-sm font-medium">Cliente</span>
            </button>
            <button onClick={() => setType('CARRIER')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 ${type === 'CARRIER' ? 'border-lime-500 bg-lime-50' : 'border-slate-200'}`}>
              <Building2 className={`w-6 h-6 ${type === 'CARRIER' ? 'text-lime-600' : 'text-slate-400'}`} />
              <span className="text-sm font-medium">Transportadora</span>
            </button>
          </div>
          {type === 'CARRIER' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Nome da transportadora</label>
              <input value={carrierName} onChange={(e) => setCarrierName(e.target.value)} placeholder="Ex: Expresso XYZ" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleConfirm} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 flex items-center gap-2">
            <Truck className="w-4 h-4" /> {saving ? 'Salvando…' : 'Confirmar entrega'}
          </button>
        </div>
      </div>
    </div>
  );
}
