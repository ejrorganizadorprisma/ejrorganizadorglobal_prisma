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
  Settings,
  UserCog,
  Shield,
  ClipboardEdit,
  Database,
  DollarSign,
  Wallet,
  Plus,
  Tag,
  Truck,
  Boxes,
  HardHat,
  Book,
  Printer,
  Globe,
  Smartphone,
  Receipt,
  Percent,
  MapPin,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useAuth } from '../hooks/useAuth';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import type { AppPage } from '@ejr/shared-types';

interface MenuItem {
  name: string;
  path?: string;
  icon: React.ReactNode;
  submenu?: MenuItem[];
  page?: AppPage; // For permission checking
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    page: 'dashboard' as AppPage,
  },
  {
    name: 'Visão Geral',
    path: '/overview',
    icon: <TrendingUp className="w-5 h-5" />,
    page: 'overview' as AppPage,
  },
  {
    name: 'Dashboard Manufatura',
    path: '/manufacturing',
    icon: <Factory className="w-5 h-5" />,
    page: 'manufacturing' as AppPage,
  },
  {
    name: 'Produtos',
    icon: <Package className="w-5 h-5" />,
    page: 'products' as AppPage,
    submenu: [
      { name: 'Lista de Produtos', path: '/products', icon: <Package className="w-4 h-4" />, page: 'products' as AppPage },
      { name: 'Novo Produto', path: '/products/new', icon: <Package className="w-4 h-4" />, page: 'products' as AppPage },
    ],
  },
  {
    name: 'Serviços',
    icon: <Wrench className="w-5 h-5" />,
    page: 'products' as AppPage,
    submenu: [
      { name: 'Lista de Serviços', path: '/services', icon: <Wrench className="w-4 h-4" />, page: 'products' as AppPage },
      { name: 'Novo Serviço', path: '/services/new', icon: <Wrench className="w-4 h-4" />, page: 'products' as AppPage },
    ],
  },
  {
    name: 'Clientes',
    icon: <Users className="w-5 h-5" />,
    page: 'customers' as AppPage,
    submenu: [
      { name: 'Lista de Clientes', path: '/customers', icon: <Users className="w-4 h-4" />, page: 'customers' as AppPage },
      { name: 'Novo Cliente', path: '/customers/new', icon: <Users className="w-4 h-4" />, page: 'customers' as AppPage },
    ],
  },
  {
    name: 'Orçamentos',
    icon: <FileText className="w-5 h-5" />,
    page: 'quotes' as AppPage,
    submenu: [
      { name: 'Lista de Orçamentos', path: '/quotes', icon: <FileText className="w-4 h-4" />, page: 'quotes' as AppPage },
      { name: 'Novo Orçamento', path: '/quotes/new', icon: <FileText className="w-4 h-4" />, page: 'quotes' as AppPage },
    ],
  },
  {
    name: 'Vendas',
    icon: <DollarSign className="w-5 h-5" />,
    page: 'sales' as AppPage,
    submenu: [
      { name: 'Lista de Vendas', path: '/sales', icon: <DollarSign className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'Nova Venda', path: '/sales/new', icon: <DollarSign className="w-4 h-4" />, page: 'sales' as AppPage },
    ],
  },
  {
    name: 'Vendedores',
    path: '/sellers',
    icon: <Users className="w-5 h-5" />,
    page: 'sellers' as AppPage,
  },
  {
    name: 'Financeiro',
    icon: <Wallet className="w-5 h-5" />,
    page: 'sales' as AppPage,
    submenu: [
      { name: 'Dashboard', path: '/financial', icon: <Wallet className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'Caixa', path: '/financial/cashbox', icon: <DollarSign className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'Cobrancas', path: '/collections', icon: <Receipt className="w-4 h-4" />, page: 'collections' as AppPage },
      { name: 'Comissoes', path: '/commissions', icon: <Percent className="w-4 h-4" />, page: 'commissions' as AppPage },
      { name: 'Devedores', path: '/financial/debtors', icon: <Users className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'Calendário', path: '/financial/calendar', icon: <Wallet className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'A Receber', path: '/financial/receivables', icon: <Wallet className="w-4 h-4" />, page: 'sales' as AppPage },
      { name: 'A Pagar', path: '/financial/payables', icon: <Wallet className="w-4 h-4" />, page: 'sales' as AppPage },
    ],
  },
  {
    name: 'Ordens de Serviço',
    icon: <Wrench className="w-5 h-5" />,
    page: 'service_orders' as AppPage,
    submenu: [
      { name: 'Lista de OS', path: '/service-orders', icon: <Wrench className="w-4 h-4" />, page: 'service_orders' as AppPage },
      { name: 'Nova OS', path: '/service-orders/new', icon: <Wrench className="w-4 h-4" />, page: 'service_orders' as AppPage },
    ],
  },
  {
    name: 'Fornecedores',
    icon: <Users className="w-5 h-5" />,
    page: 'suppliers' as AppPage,
    submenu: [
      { name: 'Lista de Fornecedores', path: '/suppliers', icon: <Users className="w-4 h-4" />, page: 'suppliers' as AppPage },
      { name: 'Novo Fornecedor', path: '/suppliers/new', icon: <Users className="w-4 h-4" />, page: 'suppliers' as AppPage },
    ],
  },
  {
    name: 'Orç. de Compra',
    icon: <ShoppingCart className="w-5 h-5" />,
    page: 'purchase_budgets' as AppPage,
    submenu: [
      { name: 'Orçamentos de Compra', path: '/purchase-budgets', icon: <ShoppingCart className="w-4 h-4" />, page: 'purchase_budgets' as AppPage },
      { name: 'Novo Orç. de Compra', path: '/purchase-budgets/new', icon: <Plus className="w-4 h-4" />, page: 'purchase_budgets' as AppPage },
      { name: 'Delegações', path: '/purchase-budgets/delegations', icon: <Shield className="w-4 h-4" />, page: 'purchase_budgets' as AppPage },
    ],
  },
  {
    name: 'Pedidos',
    icon: <Truck className="w-5 h-5" />,
    page: 'supplier_orders' as AppPage,
    submenu: [
      { name: 'Pedidos por Fornecedor', path: '/supplier-orders', icon: <Truck className="w-4 h-4" />, page: 'supplier_orders' as AppPage },
      { name: 'Recebimentos', path: '/goods-receipts', icon: <PackageOpen className="w-4 h-4" />, page: 'goods_receipts' as AppPage },
    ],
  },
  {
    name: 'Produção',
    icon: <Factory className="w-5 h-5" />,
    page: 'production_batches' as AppPage,
    submenu: [
      { name: 'Lotes de Produção', path: '/production-batches', icon: <Boxes className="w-4 h-4" />, page: 'production_batches' as AppPage },
      { name: 'Novo Lote', path: '/production-batches/new', icon: <Plus className="w-4 h-4" />, page: 'production_batches' as AppPage },
      { name: 'Fabricação 3D e Laser', path: '/digital-fabrication', icon: <Printer className="w-4 h-4" />, page: 'digital_fabrication' as AppPage },
      { name: 'Reservas de Estoque', path: '/stock-reservations', icon: <Lock className="w-4 h-4" />, page: 'stock_reservations' as AppPage },
    ],
  },
  {
    name: 'Minha Produção',
    path: '/my-production',
    icon: <HardHat className="w-5 h-5" />,
    page: 'my_production' as AppPage,
  },
  {
    name: 'Relatórios',
    icon: <TrendingUp className="w-5 h-5" />,
    page: 'reports' as AppPage,
    submenu: [
      { name: 'Central de Relatórios', path: '/reports', icon: <TrendingUp className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Fornecedores', path: '/reports/suppliers', icon: <Users className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Produtos', path: '/reports/products', icon: <Package className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Clientes', path: '/reports/customers', icon: <Users className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Vendas', path: '/reports/sales', icon: <DollarSign className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Financeiro', path: '/reports/financial', icon: <Wallet className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Orç. de Compra', path: '/reports/purchases', icon: <ShoppingCart className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Pedidos', path: '/reports/orders', icon: <Truck className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Produção', path: '/reports/production', icon: <Factory className="w-4 h-4" />, page: 'reports' as AppPage },
      { name: 'Ordens de Serviço', path: '/reports/service-orders', icon: <Wrench className="w-4 h-4" />, page: 'reports' as AppPage },
    ],
  },
  {
    name: 'Configurações',
    icon: <Settings className="w-5 h-5" />,
    submenu: [
      { name: 'Configurações do Sistema', path: '/settings/system', icon: <Globe className="w-4 h-4" />, page: 'users' as AppPage },
      { name: 'Usuários', path: '/users', icon: <UserCog className="w-4 h-4" />, page: 'users' as AppPage },
      { name: 'Permissões', path: '/permissions', icon: <Shield className="w-4 h-4" />, page: 'users' as AppPage },
      { name: 'Configurações de Documentos', path: '/settings/document-settings', icon: <FileText className="w-4 h-4" />, page: 'document_settings' as AppPage },
      { name: 'Categorias de Produtos', path: '/settings/product-categories', icon: <Tag className="w-4 h-4" />, page: 'products' as AppPage },
      { name: 'Máquinas 3D/Laser', path: '/fabrication-machines', icon: <Printer className="w-4 h-4" />, page: 'digital_fabrication' as AppPage },
      { name: 'Localização de Estoque', path: '/storage-locations', icon: <Package className="w-4 h-4" />, page: 'storage_locations' as AppPage },
      { name: 'Ajuste de Estoque', path: '/stock-adjustment', icon: <ClipboardEdit className="w-4 h-4" />, page: 'stock_adjustment' as AppPage },
      { name: 'Backup', path: '/backup', icon: <Database className="w-4 h-4" />, page: 'backup' as AppPage },
      { name: 'Aplicativo Celular', path: '/settings/mobile-app', icon: <Smartphone className="w-4 h-4" />, page: 'users' as AppPage },
      { name: 'Log GPS', path: '/gps-log', icon: <MapPin className="w-4 h-4" />, page: 'gps_log' as AppPage },
    ],
  },
];

interface SidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ item, isActive, onToggle, isOpen, onNavigate }: SidebarItemProps) {
  const location = useLocation();

  if (item.submenu) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            isOpen
              ? 'bg-blue-700 text-white'
              : 'text-blue-50 hover:bg-blue-700/50'
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
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname === subitem.path
                    ? 'bg-blue-800 text-white font-medium'
                    : 'text-blue-100 hover:bg-blue-700/50'
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
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-800 text-white shadow-lg'
          : 'text-blue-50 hover:bg-blue-700/50'
      }`}
    >
      {item.icon}
      <span>{item.name}</span>
    </Link>
  );
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const { hasPermission } = usePagePermissions();
  const { user } = useAuth();
  const { data: docSettings } = useDefaultDocumentSettings();

  // Check if user is admin (OWNER or DIRECTOR)
  const isAdmin = user?.role === 'OWNER' || user?.role === 'DIRECTOR';

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  // Filter menu items based on user permissions
  const filteredMenuItems = useMemo(() => {
    return menuItems
      .map((item) => {
        // Special handling for Configurações menu - add Manual for admins
        if (item.name === 'Configurações' && item.submenu) {
          const filteredSubmenu = item.submenu.filter((subitem) => {
            if (!subitem.page) return true;
            return hasPermission(subitem.page);
          });

          // Add Manual option for admins only
          if (isAdmin) {
            filteredSubmenu.push({
              name: 'Manual do Sistema',
              path: '/settings/manual',
              icon: <Book className="w-4 h-4" />,
            });
          }

          if (filteredSubmenu.length === 0) return null;

          return {
            ...item,
            submenu: filteredSubmenu,
          };
        }

        // If item has no page permission requirement, show it
        if (!item.page) return item;

        // Check if user has permission for this page
        if (!hasPermission(item.page)) return null;

        // If item has submenu, filter submenu items too
        if (item.submenu) {
          const filteredSubmenu = item.submenu.filter((subitem) => {
            if (!subitem.page) return true;
            return hasPermission(subitem.page);
          });

          // Only show parent if it has at least one visible submenu item
          if (filteredSubmenu.length === 0) return null;

          return {
            ...item,
            submenu: filteredSubmenu,
          };
        }

        return item;
      })
      .filter((item): item is MenuItem => item !== null);
  }, [hasPermission, isAdmin]);

  return (
    <aside className="w-64 bg-[#0B5C9A] border-r border-blue-700 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6 border-b border-blue-700 bg-[#0B5C9A]">
        <div className="flex items-center justify-center mb-3">
          {docSettings?.companyLogo ? (
            <img
              src={docSettings.companyLogo}
              alt={docSettings.companyName || 'Logomarca'}
              className="h-32 w-auto object-contain"
            />
          ) : (
            <img
              src="/logo.jpeg"
              alt="EJR Organizador"
              className="h-32 w-auto object-contain"
            />
          )}
        </div>
        <p className="text-sm text-blue-50 text-center font-medium">ERP de Manufatura</p>
      </div>

      <nav className="px-3 pb-6 bg-[#0B5C9A]">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              isActive={location.pathname === item.path}
              onToggle={() => toggleMenu(item.name)}
              isOpen={openMenus[item.name]}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="px-6 py-4 border-t border-blue-700 bg-[#0B5C9A]">
        <div className="flex justify-center mb-2">
          <img
            src="/logo.jpeg"
            alt="EJR Organizador"
            className="h-[6.4rem] w-auto object-contain"
          />
        </div>
        <p className="text-xs text-blue-100">
          Versão 2.5.1
        </p>
        <p className="text-xs text-blue-200 mt-1">
          © 2026 EJR Organizador Global
        </p>
      </div>
    </aside>
  );
}
