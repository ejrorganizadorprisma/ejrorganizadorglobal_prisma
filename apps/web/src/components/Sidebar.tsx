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
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { usePagePermissions } from '../hooks/usePagePermissions';
import { useAuth } from '../hooks/useAuth';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import type { AppPage } from '@ejr/shared-types';

interface MenuItem {
  name: string;
  path?: string;
  icon: LucideIcon;
  submenu?: MenuItem[];
  page?: AppPage;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    label: 'Principal',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        page: 'dashboard' as AppPage,
      },
      {
        name: 'Visão Geral',
        path: '/overview',
        icon: TrendingUp,
        page: 'overview' as AppPage,
      },
      {
        name: 'Dashboard Manufatura',
        path: '/manufacturing',
        icon: Factory,
        page: 'manufacturing' as AppPage,
      },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      {
        name: 'Produtos',
        icon: Package,
        page: 'products' as AppPage,
        submenu: [
          { name: 'Lista de Produtos', path: '/products', icon: Package, page: 'products' as AppPage },
          { name: 'Novo Produto', path: '/products/new', icon: Plus, page: 'products' as AppPage },
        ],
      },
      {
        name: 'Serviços',
        icon: Wrench,
        page: 'products' as AppPage,
        submenu: [
          { name: 'Lista de Serviços', path: '/services', icon: Wrench, page: 'products' as AppPage },
          { name: 'Novo Serviço', path: '/services/new', icon: Plus, page: 'products' as AppPage },
        ],
      },
      {
        name: 'Clientes',
        icon: Users,
        page: 'customers' as AppPage,
        submenu: [
          { name: 'Lista de Clientes', path: '/customers', icon: Users, page: 'customers' as AppPage },
          { name: 'Novo Cliente', path: '/customers/new', icon: Plus, page: 'customers' as AppPage },
        ],
      },
      {
        name: 'Vendedores',
        path: '/sellers',
        icon: Users,
        page: 'sellers' as AppPage,
      },
      {
        name: 'Fornecedores',
        icon: Users,
        page: 'suppliers' as AppPage,
        submenu: [
          { name: 'Lista de Fornecedores', path: '/suppliers', icon: Users, page: 'suppliers' as AppPage },
          { name: 'Novo Fornecedor', path: '/suppliers/new', icon: Plus, page: 'suppliers' as AppPage },
        ],
      },
    ],
  },
  {
    label: 'Operação',
    items: [
      {
        name: 'Orçamentos',
        icon: FileText,
        page: 'quotes' as AppPage,
        submenu: [
          { name: 'Lista de Orçamentos', path: '/quotes', icon: FileText, page: 'quotes' as AppPage },
          { name: 'Novo Orçamento', path: '/quotes/new', icon: Plus, page: 'quotes' as AppPage },
        ],
      },
      {
        name: 'Vendas',
        icon: DollarSign,
        page: 'sales' as AppPage,
        submenu: [
          { name: 'Lista de Vendas', path: '/sales', icon: DollarSign, page: 'sales' as AppPage },
          { name: 'Nova Venda', path: '/sales/new', icon: Plus, page: 'sales' as AppPage },
        ],
      },
      {
        name: 'Ordens de Serviço',
        icon: Wrench,
        page: 'service_orders' as AppPage,
        submenu: [
          { name: 'Lista de OS', path: '/service-orders', icon: Wrench, page: 'service_orders' as AppPage },
          { name: 'Nova OS', path: '/service-orders/new', icon: Plus, page: 'service_orders' as AppPage },
        ],
      },
      {
        name: 'Minha Produção',
        path: '/my-production',
        icon: HardHat,
        page: 'my_production' as AppPage,
      },
    ],
  },
  {
    label: 'Compras & Produção',
    items: [
      {
        name: 'Orç. de Compra',
        icon: ShoppingCart,
        page: 'purchase_budgets' as AppPage,
        submenu: [
          { name: 'Orçamentos de Compra', path: '/purchase-budgets', icon: ShoppingCart, page: 'purchase_budgets' as AppPage },
          { name: 'Novo Orç. de Compra', path: '/purchase-budgets/new', icon: Plus, page: 'purchase_budgets' as AppPage },
          { name: 'Delegações', path: '/purchase-budgets/delegations', icon: Shield, page: 'purchase_budgets' as AppPage },
        ],
      },
      {
        name: 'Pedidos',
        icon: Truck,
        page: 'supplier_orders' as AppPage,
        submenu: [
          { name: 'Pedidos por Fornecedor', path: '/supplier-orders', icon: Truck, page: 'supplier_orders' as AppPage },
          { name: 'Recebimentos', path: '/goods-receipts', icon: PackageOpen, page: 'goods_receipts' as AppPage },
        ],
      },
      {
        name: 'Produção',
        icon: Factory,
        page: 'production_batches' as AppPage,
        submenu: [
          { name: 'Lotes de Produção', path: '/production-batches', icon: Boxes, page: 'production_batches' as AppPage },
          { name: 'Novo Lote', path: '/production-batches/new', icon: Plus, page: 'production_batches' as AppPage },
          { name: 'Fabricação 3D e Laser', path: '/digital-fabrication', icon: Printer, page: 'digital_fabrication' as AppPage },
          { name: 'Reservas de Estoque', path: '/stock-reservations', icon: Lock, page: 'stock_reservations' as AppPage },
        ],
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        name: 'Financeiro',
        icon: Wallet,
        page: 'sales' as AppPage,
        submenu: [
          { name: 'Dashboard', path: '/financial', icon: Wallet, page: 'sales' as AppPage },
          { name: 'Caixa', path: '/financial/cashbox', icon: DollarSign, page: 'sales' as AppPage },
          { name: 'Cobrancas', path: '/collections', icon: Receipt, page: 'collections' as AppPage },
          { name: 'Comissoes', path: '/commissions', icon: Percent, page: 'commissions' as AppPage },
          { name: 'Devedores', path: '/financial/debtors', icon: Users, page: 'sales' as AppPage },
          { name: 'Calendário', path: '/financial/calendar', icon: Wallet, page: 'sales' as AppPage },
          { name: 'A Receber', path: '/financial/receivables', icon: Wallet, page: 'sales' as AppPage },
          { name: 'A Pagar', path: '/financial/payables', icon: Wallet, page: 'sales' as AppPage },
        ],
      },
    ],
  },
  {
    label: 'Análise',
    items: [
      {
        name: 'Relatórios',
        icon: TrendingUp,
        page: 'reports' as AppPage,
        submenu: [
          { name: 'Central de Relatórios', path: '/reports', icon: TrendingUp, page: 'reports' as AppPage },
          { name: 'Fornecedores', path: '/reports/suppliers', icon: Users, page: 'reports' as AppPage },
          { name: 'Produtos', path: '/reports/products', icon: Package, page: 'reports' as AppPage },
          { name: 'Clientes', path: '/reports/customers', icon: Users, page: 'reports' as AppPage },
          { name: 'Vendas', path: '/reports/sales', icon: DollarSign, page: 'reports' as AppPage },
          { name: 'Financeiro', path: '/reports/financial', icon: Wallet, page: 'reports' as AppPage },
          { name: 'Orç. de Compra', path: '/reports/purchases', icon: ShoppingCart, page: 'reports' as AppPage },
          { name: 'Pedidos', path: '/reports/orders', icon: Truck, page: 'reports' as AppPage },
          { name: 'Produção', path: '/reports/production', icon: Factory, page: 'reports' as AppPage },
          { name: 'Ordens de Serviço', path: '/reports/service-orders', icon: Wrench, page: 'reports' as AppPage },
        ],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        name: 'Configurações',
        icon: Settings,
        submenu: [
          { name: 'Configurações do Sistema', path: '/settings/system', icon: Globe, page: 'users' as AppPage },
          { name: 'Usuários', path: '/users', icon: UserCog, page: 'users' as AppPage },
          { name: 'Permissões', path: '/permissions', icon: Shield, page: 'users' as AppPage },
          { name: 'Configurações de Documentos', path: '/settings/document-settings', icon: FileText, page: 'document_settings' as AppPage },
          { name: 'Categorias de Produtos', path: '/settings/product-categories', icon: Tag, page: 'products' as AppPage },
          { name: 'Máquinas 3D/Laser', path: '/fabrication-machines', icon: Printer, page: 'digital_fabrication' as AppPage },
          { name: 'Localização de Estoque', path: '/storage-locations', icon: Package, page: 'storage_locations' as AppPage },
          { name: 'Ajuste de Estoque', path: '/stock-adjustment', icon: ClipboardEdit, page: 'stock_adjustment' as AppPage },
          { name: 'Backup', path: '/backup', icon: Database, page: 'backup' as AppPage },
          { name: 'Aplicativo Celular', path: '/settings/mobile-app', icon: Smartphone, page: 'users' as AppPage },
        ],
      },
    ],
  },
];

interface SidebarItemProps {
  item: MenuItem;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

function SidebarItem({ item, isOpen, onToggle, onNavigate }: SidebarItemProps) {
  const location = useLocation();
  const Icon = item.icon;

  if (item.submenu) {
    const hasActiveChild = item.submenu.some((sub) => sub.path === location.pathname);
    const isExpanded = isOpen || hasActiveChild;

    return (
      <div>
        <button
          onClick={onToggle}
          className={`relative group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            hasActiveChild
              ? 'text-amber-400 bg-gradient-to-r from-amber-400/[0.12] to-transparent'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          {hasActiveChild && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-amber-400 rounded-r-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          )}
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                hasActiveChild ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
              }`}
            />
            <span className="truncate">{item.name}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0">
            <div className="relative ml-[22px] pl-[14px] border-l border-white/10">
              {item.submenu.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = location.pathname === sub.path;
                return (
                  <Link
                    key={sub.path}
                    to={sub.path!}
                    onClick={onNavigate}
                    className={`relative flex items-center gap-2.5 px-3 py-2 my-0.5 rounded-md text-[13px] transition-all duration-200 ${
                      isSubActive
                        ? 'text-amber-400 bg-amber-400/[0.08] font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {isSubActive && (
                      <span className="absolute -left-[15px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    )}
                    <SubIcon className="w-[14px] h-[14px] shrink-0" />
                    <span className="truncate">{sub.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isActive = location.pathname === item.path;

  return (
    <Link
      to={item.path!}
      onClick={onNavigate}
      className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'text-amber-400 bg-gradient-to-r from-amber-400/[0.12] to-transparent'
          : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-amber-400 rounded-r-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      )}
      <Icon
        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
          isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
        }`}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = usePagePermissions();
  const { user } = useAuth();
  const { data: docSettings } = useDefaultDocumentSettings();

  const isAdmin = user?.role === 'OWNER' || user?.role === 'DIRECTOR';

  const toggleMenu = (menuName: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  // Permission + search filtering applied on top of section structure
  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const applyPermission = (item: MenuItem): MenuItem | null => {
      // Special handling for Configurações menu - add Manual for admins
      if (item.name === 'Configurações' && item.submenu) {
        const filteredSubmenu = item.submenu.filter((subitem) => {
          if (!subitem.page) return true;
          return hasPermission(subitem.page);
        });

        if (isAdmin) {
          filteredSubmenu.push({
            name: 'Manual do Sistema',
            path: '/settings/manual',
            icon: Book,
          });
        }

        if (filteredSubmenu.length === 0) return null;

        return { ...item, submenu: filteredSubmenu };
      }

      if (!item.page) return item;
      if (!hasPermission(item.page)) return null;

      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter((subitem) => {
          if (!subitem.page) return true;
          return hasPermission(subitem.page);
        });

        if (filteredSubmenu.length === 0) return null;

        return { ...item, submenu: filteredSubmenu };
      }

      return item;
    };

    const applySearch = (item: MenuItem): MenuItem | null => {
      if (!query) return item;

      const nameMatches = item.name.toLowerCase().includes(query);

      if (item.submenu) {
        if (nameMatches) return item;
        const matchedSubs = item.submenu.filter((sub) =>
          sub.name.toLowerCase().includes(query),
        );
        if (matchedSubs.length === 0) return null;
        return { ...item, submenu: matchedSubs };
      }

      return nameMatches ? item : null;
    };

    return menuSections
      .map((section) => {
        const items = section.items
          .map(applyPermission)
          .filter((i): i is MenuItem => i !== null)
          .map(applySearch)
          .filter((i): i is MenuItem => i !== null);
        return { label: section.label, items };
      })
      .filter((section) => section.items.length > 0);
  }, [hasPermission, isAdmin, searchQuery]);

  const searchActive = searchQuery.trim().length > 0;

  // Auto-expand submenu containing the active route
  useEffect(() => {
    for (const section of menuSections) {
      for (const item of section.items) {
        if (item.submenu?.some((sub) => sub.path === location.pathname)) {
          setOpenMenus((prev) => {
            if (prev[item.name]) return prev;
            return { ...prev, [item.name]: true };
          });
        }
      }
    }
  }, [location.pathname]);

  const hasAnyItems = filteredSections.length > 0;

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col bg-[#102246] border-r border-white/[0.06]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-center mb-1.5">
          <img
            src={docSettings?.companyLogo || '/logo.jpeg'}
            alt={docSettings?.companyName || 'EJR Organizador'}
            className="h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          />
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.18em] text-slate-400 font-medium">
          ERP de Manufatura
        </p>
      </div>

      {/* Search */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar menu..."
            className="w-full pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 bg-white/[0.04] border border-white/[0.06] rounded-lg focus:outline-none focus:border-amber-400/40 focus:bg-white/[0.06] transition-all"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 sidebar-scroll">
        {!hasAnyItems ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-slate-500">Nenhum item encontrado</p>
          </div>
        ) : (
          filteredSections.map((section, idx) => (
            <div key={section.label} className={idx > 0 ? 'mt-5' : ''}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.name}
                    item={item}
                    isOpen={openMenus[item.name] || searchActive}
                    onToggle={() => toggleMenu(item.name)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="EJR Organizador"
            className="h-11 w-auto max-w-[56px] object-contain rounded shrink-0 opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] text-slate-300 font-medium">EJR Organizador · v2.5.1</p>
            <p className="text-[9px] text-slate-500">© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
