import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingCart,
  Wrench,
  Factory,
  Lock,
  PackageOpen,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface MenuItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: 'Visão Geral',
    path: '/overview',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    name: 'Dashboard Manufatura',
    path: '/manufacturing',
    icon: <Factory className="w-5 h-5" />,
  },
  {
    name: 'Produtos',
    icon: <Package className="w-5 h-5" />,
    submenu: [
      { name: 'Lista de Produtos', path: '/products', icon: <Package className="w-4 h-4" /> },
      { name: 'Novo Produto', path: '/products/new', icon: <Package className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Clientes',
    icon: <Users className="w-5 h-5" />,
    submenu: [
      { name: 'Lista de Clientes', path: '/customers', icon: <Users className="w-4 h-4" /> },
      { name: 'Novo Cliente', path: '/customers/new', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Orçamentos',
    icon: <FileText className="w-5 h-5" />,
    submenu: [
      { name: 'Lista de Orçamentos', path: '/quotes', icon: <FileText className="w-4 h-4" /> },
      { name: 'Novo Orçamento', path: '/quotes/new', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Ordens de Serviço',
    icon: <Wrench className="w-5 h-5" />,
    submenu: [
      { name: 'Lista de OS', path: '/service-orders', icon: <Wrench className="w-4 h-4" /> },
      { name: 'Nova OS', path: '/service-orders/new', icon: <Wrench className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Fornecedores',
    icon: <Users className="w-5 h-5" />,
    submenu: [
      { name: 'Lista de Fornecedores', path: '/suppliers', icon: <Users className="w-4 h-4" /> },
      { name: 'Novo Fornecedor', path: '/suppliers/new', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Compras',
    icon: <ShoppingCart className="w-5 h-5" />,
    submenu: [
      { name: 'Ordens de Compra', path: '/purchase-orders', icon: <ShoppingCart className="w-4 h-4" /> },
      { name: 'Nova OC', path: '/purchase-orders/new', icon: <ShoppingCart className="w-4 h-4" /> },
      { name: 'Recebimentos', path: '/goods-receipts', icon: <PackageOpen className="w-4 h-4" /> },
      { name: 'Novo Recebimento', path: '/goods-receipts/new', icon: <PackageOpen className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Produção',
    icon: <Factory className="w-5 h-5" />,
    submenu: [
      { name: 'Ordens de Produção', path: '/production-orders', icon: <Factory className="w-4 h-4" /> },
      { name: 'Nova OP', path: '/production-orders/new', icon: <Factory className="w-4 h-4" /> },
      { name: 'Reservas de Estoque', path: '/stock-reservations', icon: <Lock className="w-4 h-4" /> },
    ],
  },
  {
    name: 'Relatórios',
    path: '/reports',
    icon: <TrendingUp className="w-5 h-5" />,
  },
];

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
}

function SidebarItem({ item, isActive, onToggle, isOpen }: SidebarItemProps) {
  const location = useLocation();

  if (item.submenu) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            isOpen
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <span>{item.name}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-1">
            {item.submenu.map((subitem) => (
              <Link
                key={subitem.path}
                to={subitem.path!}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname === subitem.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {subitem.icon}
                <span>{subitem.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.path!}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {item.icon}
      <span>{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">EJR Organizador</h1>
        <p className="text-sm text-gray-500 mt-1">ERP de Manufatura</p>
      </div>

      <nav className="px-3 pb-6">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              isActive={location.pathname === item.path}
              onToggle={() => toggleMenu(item.name)}
              isOpen={openMenus[item.name]}
            />
          ))}
        </div>
      </nav>

      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Versão 2.0.0
        </p>
        <p className="text-xs text-gray-400 mt-1">
          © 2025 EJR Organizador
        </p>
      </div>
    </aside>
  );
}
