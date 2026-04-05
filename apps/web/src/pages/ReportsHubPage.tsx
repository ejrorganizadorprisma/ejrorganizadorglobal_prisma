import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Wallet,
  ShoppingCart,
  Truck,
  Factory,
  Wrench,
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Fornecedores',
    description: 'Ranking, prazos de entrega, status e histórico de preços',
    path: '/reports/suppliers',
    icon: <Users className="w-8 h-8" />,
    color: 'bg-blue-100 text-blue-700',
    count: 5,
  },
  {
    title: 'Produtos',
    description: 'Curva ABC, estoque crítico, giro, margem e mais vendidos',
    path: '/reports/products',
    icon: <Package className="w-8 h-8" />,
    color: 'bg-emerald-100 text-emerald-700',
    count: 5,
  },
  {
    title: 'Clientes',
    description: 'Ranking, inadimplentes, frequência, tipos e ticket médio',
    path: '/reports/customers',
    icon: <Users className="w-8 h-8" />,
    color: 'bg-purple-100 text-purple-700',
    count: 5,
  },
  {
    title: 'Vendas',
    description: 'Por período, vendedor, pagamento, comparativo e categoria',
    path: '/reports/sales',
    icon: <DollarSign className="w-8 h-8" />,
    color: 'bg-green-100 text-green-700',
    count: 5,
  },
  {
    title: 'Financeiro',
    description: 'Fluxo de caixa, aging, DRE simplificado e inadimplência',
    path: '/reports/financial',
    icon: <Wallet className="w-8 h-8" />,
    color: 'bg-amber-100 text-amber-700',
    count: 5,
  },
  {
    title: 'Orçamentos de Compra',
    description: 'Status, prioridade, cotações, volume e tempo de aprovação',
    path: '/reports/purchases',
    icon: <ShoppingCart className="w-8 h-8" />,
    color: 'bg-orange-100 text-orange-700',
    count: 5,
  },
  {
    title: 'Pedidos',
    description: 'Status, atrasos, recebimentos, volume e conformidade',
    path: '/reports/orders',
    icon: <Truck className="w-8 h-8" />,
    color: 'bg-cyan-100 text-cyan-700',
    count: 5,
  },
  {
    title: 'Produção',
    description: 'Eficiência, defeitos, volume, operadores e testes',
    path: '/reports/production',
    icon: <Factory className="w-8 h-8" />,
    color: 'bg-indigo-100 text-indigo-700',
    count: 5,
  },
  {
    title: 'Ordens de Serviço',
    description: 'Status, tempo médio, técnicos, custos e garantia',
    path: '/reports/service-orders',
    icon: <Wrench className="w-8 h-8" />,
    color: 'bg-rose-100 text-rose-700',
    count: 5,
  },
];

export function ReportsHubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Central de Relatórios
          </h1>
          <p className="text-gray-600 mt-1">
            45 relatórios organizados em 9 categorias para análise completa do seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((cat) => (
            <button
              key={cat.path}
              onClick={() => navigate(cat.path)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${cat.color}`}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                  <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {cat.count} relatórios
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
