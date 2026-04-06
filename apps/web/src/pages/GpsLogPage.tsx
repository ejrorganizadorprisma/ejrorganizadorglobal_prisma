import { useState } from 'react';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { useGpsEvents } from '../hooks/useGpsEvents';
import type { GpsEvent } from '../hooks/useGpsEvents';
import { useUsers } from '../hooks/useUsers';
import { AppPage } from '@ejr/shared-types';
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const eventTypeLabels: Record<string, string> = {
  SALE: 'Venda',
  QUOTE: 'Orcamento',
  COLLECTION: 'Cobranca',
};

const eventTypeConfig: Record<string, { bg: string; text: string }> = {
  SALE: { bg: 'bg-green-100', text: 'text-green-800' },
  QUOTE: { bg: 'bg-blue-100', text: 'text-blue-800' },
  COLLECTION: { bg: 'bg-amber-100', text: 'text-amber-800' },
};

export function GpsLogPage() {
  const permissionCheck = useRequirePermission({
    page: 'gps_log' as AppPage,
    message: 'Voce nao tem permissao para acessar o log GPS.',
  });

  if (permissionCheck) return permissionCheck;

  return <GpsLogPageContent />;
}

function GpsLogPageContent() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const { data, isLoading } = useGpsEvents({
    page,
    limit,
    userId: userId || undefined,
    eventType: eventType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: usersData } = useUsers({ limit: 100 });
  const users = usersData?.data || [];

  const events = data?.data || [];
  const totalItems = data?.pagination?.total || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <MapPin className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log GPS</h1>
          <p className="text-sm text-gray-500">Registro de localizacao GPS de eventos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Todos usuarios</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Todos tipos</option>
          <option value="SALE">Venda</option>
          <option value="QUOTE">Orcamento</option>
          <option value="COLLECTION">Cobranca</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Carregando registros GPS...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">Nenhum registro GPS encontrado</p>
          <p className="text-sm text-gray-400">Ajuste os filtros ou aguarde novos registros</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Evento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Latitude</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Longitude</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Mapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event: GpsEvent) => {
                  const typeCfg = eventTypeConfig[event.eventType] || { bg: 'bg-gray-100', text: 'text-gray-800' };
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{event.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeCfg.bg} ${typeCfg.text}`}>
                          {eventTypeLabels[event.eventType] || event.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{event.eventId}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">{event.latitude.toFixed(6)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">{event.longitude.toFixed(6)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(event.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalItems > limit && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)} de {totalItems}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalItems}
              className="p-2 border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
