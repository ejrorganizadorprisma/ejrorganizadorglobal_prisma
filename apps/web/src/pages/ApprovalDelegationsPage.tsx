import { useState, useEffect } from 'react';
import { useApprovalDelegations, useCreateDelegation, useRevokeDelegation } from '../hooks/useApprovalDelegations';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Plus, XCircle, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ApprovalDelegationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: delegations = [], isLoading } = useApprovalDelegations();
  const createDelegation = useCreateDelegation();
  const revokeDelegation = useRevokeDelegation();

  const [showForm, setShowForm] = useState(false);
  const [delegatedTo, setDelegatedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  // Load users for selection
  useEffect(() => {
    import('../lib/api').then(({ api }) => {
      api.get('/users').then((res) => {
        setUsers(res.data.data || res.data || []);
      }).catch(() => {});
    });
  }, []);

  const isAdmin = user?.role === 'OWNER' || user?.role === 'DIRECTOR';

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!delegatedTo || !startDate || !endDate) {
      toast.error('Preencha todos os campos.');
      return;
    }
    try {
      await createDelegation.mutateAsync({ delegatedTo, startDate, endDate });
      toast.success('Delegação criada.');
      setShowForm(false);
      setDelegatedTo('');
      setStartDate('');
      setEndDate('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar delegação.');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revogar esta delegação?')) return;
    try {
      await revokeDelegation.mutateAsync(id);
      toast.success('Delegação revogada.');
    } catch (error: any) {
      toast.error('Erro ao revogar.');
    }
  };

  const isActive = (d: any) => d.isActive && new Date(d.startDate) <= new Date() && new Date(d.endDate) >= new Date();

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/purchase-budgets')} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0" title="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">Delegações de Aprovação</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Delegação</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-indigo-50 p-3 rounded-xl mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
              <select
                value={delegatedTo}
                onChange={(e) => setDelegatedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Selecionar...</option>
                {users.filter((u: any) => u.id !== user?.id && u.isActive).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={createDelegation.isPending}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
            Criar Delegação
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : delegations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhuma delegação cadastrada.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-[520px] table-fixed text-[13px]">
            <colgroup>
              <col />
              <col className="w-[190px]" />
              <col className="w-[140px]" />
              <col className="w-[60px]" />
            </colgroup>
            <thead>
              <tr className="border-b bg-gray-50/70 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Delegado</th>
                <th className="px-3 py-2 text-left">Período</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {delegations.map((d: any) => (
                <tr key={d.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-3 py-2 font-medium text-gray-900 truncate" title={d.delegatedToUser?.name || d.delegatedTo}>
                    {d.delegatedToUser?.name || d.delegatedTo}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap tabular-nums">
                    {new Date(d.startDate).toLocaleDateString('pt-BR')} - {new Date(d.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 py-2">
                    {isActive(d) ? (
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap bg-green-100 text-green-800">Ativa</span>
                    ) : d.isActive ? (
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap bg-yellow-100 text-yellow-800">Agendada/Expirada</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap bg-gray-100 text-gray-500">Revogada</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.isActive && (
                      <button onClick={() => handleRevoke(d.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Revogar">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
