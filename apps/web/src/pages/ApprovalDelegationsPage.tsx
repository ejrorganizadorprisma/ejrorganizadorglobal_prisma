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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => navigate('/purchase-budgets')} className="p-2 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Shield className="w-7 h-7 text-indigo-600" />
        <h1 className="text-xl lg:text-2xl font-bold">Delegações de Aprovação</h1>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 mb-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        <Plus className="w-4 h-4" />
        Nova Delegação
      </button>

      {showForm && (
        <div className="bg-indigo-50 p-4 rounded-lg mb-6">
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
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delegado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {delegations.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{d.delegatedToUser?.name || d.delegatedTo}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(d.startDate).toLocaleDateString('pt-BR')} - {new Date(d.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(d) ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativa</span>
                    ) : d.isActive ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Agendada/Expirada</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">Revogada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.isActive && (
                      <button onClick={() => handleRevoke(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Revogar">
                        <XCircle className="w-4 h-4" />
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
