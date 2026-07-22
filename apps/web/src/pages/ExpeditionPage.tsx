import { useState } from 'react';
import { toast } from 'sonner';
import {
  Truck, PackageCheck, FileText, Boxes, Link2, User, Calendar, X, CheckCircle2,
} from 'lucide-react';
import { useExpeditionQueue, useExpeditionSale, useCollectSale, useUploadSaleFile } from '../hooks/useSales';
import { useActiveCarriers } from '../hooks/useCarriers';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { CurrencyInput } from '../components/CurrencyInput';
import { api } from '../lib/api';
import type { Sale } from '@ejr/shared-types';
import { CURRENCY_CONFIG, type Currency } from '@ejr/shared-types';

function fileUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
  return `${base}${url}`;
}

export default function ExpeditionPage() {
  const { data: settings } = useSystemSettings();
  const byCode = settings?.floorIdentificationMethod === 'EMPLOYEE_CODE';
  const defaultCurrency = (settings?.defaultCurrency as Currency) || 'BRL';
  const { data: queue = [], isLoading } = useExpeditionQueue();

  const inExpedition = queue.filter((s) => s.fulfillmentStatus === 'IN_EXPEDITION');
  const awaiting = queue.filter((s) => s.fulfillmentStatus === 'AWAITING_CARRIER');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Expedição</h1>
          <p className="text-sm text-slate-500">Conferência final com a NF, volumes/atados e coleta pela transportadora.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Carregando…</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Em Expedição ({inExpedition.length})</h2>
            {inExpedition.length === 0 ? (
              <Empty text="Nenhuma venda em expedição." />
            ) : inExpedition.map((s) => <ExpeditionCard key={s.id} sale={s} byCode={byCode} />)}
          </section>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Aguardando Transportadora ({awaiting.length})</h2>
            {awaiting.length === 0 ? (
              <Empty text="Nenhuma venda aguardando coleta." />
            ) : awaiting.map((s) => <CollectionCard key={s.id} sale={s} byCode={byCode} defaultCurrency={defaultCurrency} />)}
          </section>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">{text}</div>;
}

function SaleHeader({ sale }: { sale: Sale }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-slate-800">{sale.saleNumber}</p>
        <p className="text-sm text-slate-500">{sale.customer?.name}</p>
      </div>
      {sale.nfNumber && (
        <div className="text-right">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1 justify-end"><FileText className="w-3 h-3" /> NF {sale.nfNumber}</span>
          {sale.nfFileUrl && <a href={fileUrl(sale.nfFileUrl)} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 justify-end mt-1"><Link2 className="w-3 h-3" /> ver NF</a>}
        </div>
      )}
    </div>
  );
}

function ItemsList({ sale }: { sale: Sale }) {
  const items = sale.items ?? [];
  if (!items.length) return null;
  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-1">
      {items.map((it: any) => (
        <div key={it.id} className="flex items-center justify-between text-sm">
          <span className="text-slate-700 truncate">{it.product?.name || it.serviceName || 'Item'}</span>
          <span className="font-bold text-slate-800">{it.quantity}</span>
        </div>
      ))}
    </div>
  );
}

function ExpeditionCard({ sale, byCode }: { sale: Sale; byCode: boolean }) {
  const { data: carriers = [] } = useActiveCarriers();
  const expedition = useExpeditionSale();
  const [carrierId, setCarrierId] = useState(sale.carrierId || '');
  const [volumes, setVolumes] = useState<number>(sale.volumesCount || 1);
  const [bundles, setBundles] = useState<number>(sale.bundlesCount || 0);
  const [scheduled, setScheduled] = useState(sale.carrierScheduledDate?.slice(0, 10) || '');
  const [notes, setNotes] = useState(sale.expeditionNotes || '');
  const [code, setCode] = useState('');

  const submit = async () => {
    if (!carrierId) { toast.error('Selecione a transportadora'); return; }
    if (!volumes || volumes < 1) { toast.error('Informe a quantidade de volumes'); return; }
    if (byCode && !code.trim()) { toast.error('Informe seu código de funcionário'); return; }
    try {
      await expedition.mutateAsync({ id: sale.id, data: { carrierId, carrierScheduledDate: scheduled || undefined, volumesCount: volumes, bundlesCount: bundles, expeditionNotes: notes || undefined, employeeCode: code.trim() || undefined } });
      toast.success('Expedição fechada. Aguardando transportadora.');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao fechar expedição');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
      <SaleHeader sale={sale} />
      <ItemsList sale={sale} />
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>Transportadora *</span>
            {carriers.length === 0 && <a href="/cadastros/transportadoras" className="text-cyan-600 hover:underline font-normal">+ cadastrar</a>}
          </label>
          <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
            <option value="">Selecione…</option>
            {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Boxes className="w-3 h-3" /> Volumes *</label>
          <input type="number" min={1} value={volumes} onChange={(e) => setVolumes(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Atados</label>
          <input type="number" min={0} value={bundles} onChange={(e) => setBundles(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Coleta agendada</label>
          <input type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Observações</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
        </div>
        {byCode && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Seu código</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
        )}
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={submit} disabled={expedition.isPending} className="px-5 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2">
          <PackageCheck className="w-4 h-4" /> Fechar expedição
        </button>
      </div>
    </div>
  );
}

function CollectionCard({ sale, byCode, defaultCurrency }: { sale: Sale; byCode: boolean; defaultCurrency: Currency }) {
  const { data: carriers = [] } = useActiveCarriers();
  const collect = useCollectSale();
  const upload = useUploadSaleFile();
  const [open, setOpen] = useState(false);
  const [driver, setDriver] = useState('');
  const [volumes, setVolumes] = useState<number>(sale.volumesCount || 1);
  const [carrierId, setCarrierId] = useState(sale.carrierId || '');
  const [freightValue, setFreightValue] = useState<number>(sale.shippingCost || 0);
  const [freightCurrency, setFreightCurrency] = useState<Currency>((sale.freightCurrency as Currency) || defaultCurrency);
  const [freightMode, setFreightMode] = useState<'' | 'CIF' | 'FOB'>((sale.freightMode as any) || '');
  const [tracking, setTracking] = useState(sale.trackingCode || '');
  const [forecast, setForecast] = useState(sale.deliveryForecast?.slice(0, 10) || '');
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (byCode && !code.trim()) { toast.error('Informe seu código de funcionário'); return; }
    try {
      await collect.mutateAsync({ id: sale.id, data: {
        driverName: driver || undefined,
        collectionCarrierVolumes: volumes,
        employeeCode: code.trim() || undefined,
        carrierId: carrierId || undefined,
        shippingCost: freightValue || undefined,
        freightCurrency,
        freightMode: freightMode || undefined,
        trackingCode: tracking || undefined,
        deliveryForecast: forecast || undefined,
      } });
      if (file) await upload.mutateAsync({ id: sale.id, endpoint: 'collection-receipt', file });
      toast.success('Coleta registrada!');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao registrar coleta');
    }
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4 mb-3">
      <SaleHeader sale={sale} />
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-amber-600" /> {sale.carrier?.name || 'Transportadora'}</span>
        <span className="flex items-center gap-1"><Boxes className="w-4 h-4" /> {sale.volumesCount ?? '-'} vol · {sale.bundlesCount ?? 0} atados</span>
        {sale.carrierScheduledDate && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {sale.carrierScheduledDate.slice(0, 10)}</span>}
      </div>

      {!open ? (
        <div className="flex justify-end mt-3">
          <button onClick={() => setOpen(true)} className="px-5 py-2 text-sm font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Avisar coleta
          </button>
        </div>
      ) : (
        <div className="mt-3 border-t border-amber-100 pt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Transportadora</span>
              {carriers.length === 0 && <a href="/cadastros/transportadoras" className="text-cyan-600 hover:underline font-normal">+ cadastrar</a>}
            </label>
            <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
              <option value="">Selecione…</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Moeda do frete</label>
            <select
              value={freightCurrency}
              onChange={(e) => { setFreightCurrency(e.target.value as Currency); setFreightValue(0); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
            >
              {(['BRL', 'PYG', 'USD'] as Currency[]).map((c) => (
                <option key={c} value={c}>{CURRENCY_CONFIG[c].symbol} — {CURRENCY_CONFIG[c].label}</option>
              ))}
            </select>
          </div>
          <div>
            <CurrencyInput
              label="Valor do frete"
              value={freightValue}
              currency={freightCurrency}
              onChange={(v) => setFreightValue(v)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Modalidade (frete)</label>
            <select value={freightMode} onChange={(e) => setFreightMode(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none">
              <option value="">—</option>
              <option value="CIF">CIF (remetente paga)</option>
              <option value="FOB">FOB (destinatário paga)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Código de rastreio</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Previsão de entrega</label>
            <input type="date" value={forecast} onChange={(e) => setForecast(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Motorista/Responsável</label>
            <input value={driver} onChange={(e) => setDriver(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Volumes conferidos</label>
            <input type="number" min={0} value={volumes} onChange={(e) => setVolumes(parseInt(e.target.value, 10) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Imagem do recibo (assinatura)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          {byCode && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Seu código</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
            </div>
          )}
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
            <button onClick={submit} disabled={collect.isPending || upload.isPending} className="px-5 py-2 text-sm font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">Confirmar coleta</button>
          </div>
        </div>
      )}
    </div>
  );
}
