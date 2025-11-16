import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, useDeleteQuote } from '../hooks/useQuotes';
import { useConvertToSale } from '../hooks/useSales';

export function QuotesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<any>('');

  const { data, isLoading } = useQuotes({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
  });

  const deleteQuote = useDeleteQuote();
  const convertToSale = useConvertToSale();

  const handleDelete = async (id: string, number: string) => {
    if (window.confirm(`Excluir orçamento ${number}?`)) {
      await deleteQuote.mutateAsync(id);
    }
  };

  const handleConvertToSale = async (id: string, number: string) => {
    if (window.confirm(`Converter orçamento ${number} em venda? Esta ação irá atualizar o estoque.`)) {
      try {
        await convertToSale.mutateAsync(id);
        alert('Orçamento convertido em venda com sucesso!');
      } catch (error) {
        alert('Erro ao converter orçamento em venda');
        console.error(error);
      }
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const statusColors: any = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-yellow-100 text-yellow-800',
    CONVERTED: 'bg-purple-100 text-purple-800',
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="text-xl">Carregando...</div></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orçamentos</h1>
        <button onClick={() => navigate('/quotes/new')} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Novo Orçamento
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar orçamento..." className="px-3 py-2 border rounded" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">Todos status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviado</option>
            <option value="APPROVED">Aprovado</option>
            <option value="REJECTED">Rejeitado</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CONVERTED">Convertido</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data.map((quote: any) => (
              <tr key={quote.id}>
                <td className="px-6 py-4 whitespace-nowrap">{quote.quote_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">{quote.customer?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatPrice(quote.total)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[quote.status]}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(quote.valid_until).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button onClick={() => navigate(`/quotes/${quote.id}/edit`)} className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                  {quote.status === 'APPROVED' && (
                    <button
                      onClick={() => handleConvertToSale(quote.id, quote.quote_number)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Converter em Venda
                    </button>
                  )}
                  <button onClick={() => handleDelete(quote.id, quote.quote_number)} className="text-red-600 hover:text-red-900">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="mt-6 flex justify-between">
          <div>Página {data.pagination.page} de {data.pagination.totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.totalPages} className="px-4 py-2 border rounded disabled:opacity-50">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
