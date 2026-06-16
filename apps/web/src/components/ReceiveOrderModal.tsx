import { useState, useEffect, useMemo } from 'react';
import { useSupplierOrder } from '../hooks/useSupplierOrders';
import { useCreateGoodsReceipt, useApproveGoodsReceipt } from '../hooks/useGoodsReceipts';
import { toast } from 'sonner';
import { X, PackageCheck, Check, AlertTriangle, Ban } from 'lucide-react';

type ConfStatus = 'CONFORME' | 'DIVERGENCIA' | 'REJEITADO';

interface ConfItem {
  supplierOrderItemId: string;
  productId: string;
  productName: string;
  productCode?: string;
  quantityOrdered: number;
  quantityPending: number;
  quantityReceived: number;
  unitPrice: number;
  status: ConfStatus;
  notes: string;
}

interface ReceiveOrderModalProps {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}

export function ReceiveOrderModal({ orderId, onClose, onDone }: ReceiveOrderModalProps) {
  const { data: order, isLoading } = useSupplierOrder(orderId);
  const createReceipt = useCreateGoodsReceipt();
  const approveReceipt = useApproveGoodsReceipt();

  const [items, setItems] = useState<ConfItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order?.items) {
      setItems(
        order.items
          .filter((it: any) => (it.quantityPending ?? it.quantity) > 0)
          .map((it: any) => {
            const pending = it.quantityPending ?? it.quantity;
            return {
              supplierOrderItemId: it.id,
              productId: it.productId,
              productName: it.product?.name || '-',
              productCode: it.product?.code,
              quantityOrdered: it.quantity,
              quantityPending: pending,
              quantityReceived: pending,
              unitPrice: it.unitPrice,
              status: 'CONFORME' as ConfStatus,
              notes: '',
            };
          })
      );
    }
  }, [order]);

  const summary = useMemo(() => {
    const conformes = items.filter((i) => i.status === 'CONFORME').length;
    const divergentes = items.filter((i) => i.status === 'DIVERGENCIA').length;
    const rejeitados = items.filter((i) => i.status === 'REJEITADO').length;
    return { conformes, divergentes, rejeitados };
  }, [items]);

  const updateItem = (idx: number, field: keyof ConfItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === 'quantityReceived') {
        const qty = parseInt(value, 10) || 0;
        item.quantityReceived = qty;
        if (qty === 0) item.status = 'REJEITADO';
        else if (qty !== item.quantityPending) item.status = 'DIVERGENCIA';
        else item.status = 'CONFORME';
      }
      updated[idx] = item;
      return updated;
    });
  };

  const handleConfirm = async () => {
    if (!order) return;
    const hasReceived = items.some((i) => i.quantityReceived > 0 && i.status !== 'REJEITADO');
    if (!hasReceived) {
      toast.error('Informe a quantidade recebida de pelo menos um item.');
      return;
    }
    const semMotivo = items.filter((i) => i.status !== 'CONFORME' && !i.notes.trim());
    if (semMotivo.length > 0) {
      toast.error('Preencha o motivo dos itens com divergência ou recusados.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        supplierOrderId: order.id,
        supplierId: order.supplierId,
        receiptDate: new Date().toISOString().split('T')[0],
        invoiceNumber: invoiceNumber || undefined,
        notes: generalNotes || undefined,
        items: items.map((item) => ({
          supplierOrderItemId: item.supplierOrderItemId,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.status === 'REJEITADO' ? 0 : item.quantityReceived,
          quantityAccepted: item.status === 'REJEITADO' ? 0 : item.quantityReceived,
          quantityRejected: item.status === 'REJEITADO' ? item.quantityOrdered : 0,
          unitPrice: item.unitPrice,
          qualityStatus:
            item.status === 'CONFORME' ? 'APPROVED' : item.status === 'REJEITADO' ? 'REJECTED' : 'PENDING',
          notes: item.notes || undefined,
        })),
      };
      const receipt = await createReceipt.mutateAsync(payload);
      await approveReceipt.mutateAsync(receipt.id);
      toast.success('Recebimento confirmado! Estoque atualizado.');
      onDone();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.error || 'Erro ao confirmar recebimento.');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: ConfStatus) =>
    s === 'CONFORME'
      ? { cls: 'bg-green-100 text-green-700', icon: Check, label: 'Conforme' }
      : s === 'DIVERGENCIA'
      ? { cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle, label: 'Divergência' }
      : { cls: 'bg-red-100 text-red-700', icon: Ban, label: 'Recusado' };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              Conferência de Recebimento
            </h3>
            <p className="text-xs text-gray-500">
              {(order as any)?.budget?.title ? `${(order as any).budget.title} · ` : ''}Pedido {order?.orderNumber || ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-400">Carregando itens…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Nenhum item pendente de recebimento.</div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">{summary.conformes} conformes</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{summary.divergentes} divergências</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">{summary.rejeitados} recusados</span>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => {
                  const badge = statusBadge(item.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={item.supplierOrderItemId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                          {item.productCode && <p className="text-[10px] text-gray-400">{item.productCode}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 shrink-0 ${badge.cls}`}>
                          <BadgeIcon className="w-3 h-3" /> {badge.label}
                        </span>
                      </div>
                      <div className="flex items-end gap-4 mt-2">
                        <div className="text-xs text-gray-500">
                          Pedido: <strong className="text-gray-700">{item.quantityPending}</strong>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-gray-400">Recebido</label>
                          <input
                            type="number"
                            min={0}
                            max={item.quantityPending}
                            value={item.quantityReceived}
                            onChange={(e) => updateItem(idx, 'quantityReceived', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        {item.status !== 'CONFORME' && (
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase text-amber-600">
                              {item.status === 'REJEITADO' ? 'Motivo da recusa *' : item.quantityReceived < item.quantityPending ? 'Motivo (chegou menos) *' : 'Motivo da divergência *'}
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                              placeholder="Descreva o motivo…"
                              className={`w-full px-2 py-1 border rounded text-sm ${!item.notes ? 'border-amber-300' : 'border-gray-300'}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dados gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Nº Nota Fiscal (opcional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Observações (opcional)</label>
                  <input
                    type="text"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || isLoading || items.length === 0}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Confirmar recebimento'}
          </button>
        </div>
      </div>
    </div>
  );
}
