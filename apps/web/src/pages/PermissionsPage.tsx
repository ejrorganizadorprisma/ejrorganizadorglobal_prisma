import { useState, useEffect } from 'react';
import { Shield, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { usePermissions, useUpdatePermissions } from '../hooks/usePermissions';
import { useRequirePermission } from '../hooks/useRequirePermission';
import type { PermissionsConfig, UserRole, AppPage, PageAction, PagePermissions } from '@ejr/shared-types';

const roleLabels: Record<UserRole, string> = {
  OWNER: 'Proprietário',
  DIRECTOR: 'Diretor',
  MANAGER: 'Admin TI',
  COORDINATOR: 'Coordenador(a)',
  SALESPERSON: 'Vendedor',
  STOCK: 'Estoque',
  PRODUCTION: 'Produção',
  TECHNICIAN: 'Técnico',
  MONITOR: 'Monitor',
};

const pageLabels: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  overview: 'Visão Geral',
  manufacturing: 'Manufatura',
  products: 'Produtos',
  customers: 'Clientes',
  quotes: 'Orçamentos',
  sales: 'Vendas',
  service_orders: 'Ordens de Serviço',
  suppliers: 'Fornecedores',
  purchase_orders: 'Ordens de Compra',
  supplier_orders: 'Pedidos',
  goods_receipts: 'Recebimentos',
  purchase_requests: 'Requisições',
  production_orders: 'Ordens de Produção',
  production_batches: 'Lotes de Produção',
  my_production: 'Minha Produção',
  stock_reservations: 'Reservas de Estoque',
  reports: 'Relatórios',
  users: 'Usuários',
  document_settings: 'Config. de Documentos',
  storage_locations: 'Localização de Estoque',
  stock_adjustment: 'Ajuste de Estoque',
  backup: 'Backup',
};

const actionLabels: Record<PageAction, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  convert: 'Converter',
};

const allPages: AppPage[] = Object.keys(pageLabels) as AppPage[];
const allActions: PageAction[] = ['view', 'create', 'edit', 'delete', 'convert'];

export function PermissionsPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.USERS,
    message: 'Você não tem permissão para acessar as configurações de permissões.'
  });
  if (permissionCheck) return permissionCheck;

  const { data: permissionsData, isLoading } = usePermissions();
  const updatePermissions = useUpdatePermissions();

  const [permissions, setPermissions] = useState<PermissionsConfig>({
    permissions: [],
  });
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (permissionsData) {
      setPermissions(permissionsData);
    }
  }, [permissionsData]);

  const toggleExpand = (role: UserRole, page: AppPage) => {
    const key = `${role}-${page}`;
    setExpandedCells((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggle = (role: UserRole, page: AppPage) => {
    setPermissions((prev) => ({
      permissions: prev.permissions.map((rp) => {
        if (rp.role === role) {
          const hasPage = rp.pages.includes(page);
          const pagePermissions = rp.pagePermissions || [];

          if (hasPage) {
            // Remove page access and its granular permissions
            return {
              ...rp,
              pages: rp.pages.filter((p) => p !== page),
              pagePermissions: pagePermissions.filter((pp) => pp.page !== page),
            };
          } else {
            // Add page access with default VIEW permission
            const newPagePermission: PagePermissions = {
              page,
              actions: ['view'],
            };
            return {
              ...rp,
              pages: [...rp.pages, page],
              pagePermissions: [...pagePermissions, newPagePermission],
            };
          }
        }
        return rp;
      }),
    }));
  };

  const handleActionToggle = (role: UserRole, page: AppPage, action: PageAction) => {
    setPermissions((prev) => ({
      permissions: prev.permissions.map((rp) => {
        if (rp.role === role) {
          const pagePermissions = rp.pagePermissions || [];
          const existingPermission = pagePermissions.find((pp) => pp.page === page);

          if (existingPermission) {
            // Permission exists, update it
            const hasAction = existingPermission.actions.includes(action);
            const updatedActions = hasAction
              ? existingPermission.actions.filter((a) => a !== action)
              : [...existingPermission.actions, action];

            // Ensure VIEW is always included if any other action is selected
            const finalActions = updatedActions.includes('view') || updatedActions.length === 0
              ? updatedActions
              : ['view', ...updatedActions];

            return {
              ...rp,
              pagePermissions: pagePermissions.map((pp) =>
                pp.page === page ? { ...pp, actions: finalActions } : pp
              ),
            };
          } else {
            // Permission doesn't exist, create it
            const newPagePermission: PagePermissions = {
              page,
              actions: action === 'view' ? ['view'] : ['view', action],
            };

            return {
              ...rp,
              pagePermissions: [...pagePermissions, newPagePermission],
            };
          }
        }
        return rp;
      }),
    }));
  };

  const handleSave = () => {
    updatePermissions.mutate(permissions);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando permissões...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Configuração de Permissões
          </h1>
          <p className="text-gray-600 mt-1">
            Configure quais páginas cada função pode acessar
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updatePermissions.isPending}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updatePermissions.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[150px]">
                  Função
                </th>
                {allPages.map((page) => (
                  <th
                    key={page}
                    className="px-3 text-center relative border-b border-gray-200"
                    style={{ height: '180px', verticalAlign: 'bottom', paddingBottom: '8px' }}
                  >
                    <div
                      className="flex items-end justify-center"
                      style={{ height: '100%', width: '100%' }}
                    >
                      <span
                        className="whitespace-nowrap text-xs font-medium text-gray-700"
                        style={{
                          transform: 'rotate(-80deg)',
                          transformOrigin: '50% 50%',
                          display: 'inline-block',
                          marginBottom: '60px'
                        }}
                      >
                        {pageLabels[page]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissions.permissions.map((rolePermission) => {
                const pagePermissions = rolePermission.pagePermissions || [];

                return (
                  <tr key={rolePermission.role} className="group hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900 border-r min-w-[180px]">
                      {roleLabels[rolePermission.role]}
                    </td>
                    {allPages.map((page) => {
                      const hasPermission = rolePermission.pages.includes(page);
                      let pagePermission = pagePermissions.find((pp) => pp.page === page);

                      // Se tem permissão mas não tem pagePermission, criar um padrão
                      if (hasPermission && !pagePermission) {
                        pagePermission = {
                          page,
                          actions: ['view'],
                        };
                      }

                      const cellKey = `${rolePermission.role}-${page}`;
                      const isExpanded = expandedCells[cellKey];

                      return (
                        <td key={page} className="px-4 py-4 text-center relative">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (hasPermission) {
                                    toggleExpand(rolePermission.role, page);
                                  }
                                }}
                                className={`p-1 rounded w-5 h-5 flex items-center justify-center ${
                                  hasPermission ? 'hover:bg-gray-200 cursor-pointer' : 'invisible'
                                }`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                )}
                              </button>
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() =>
                                  handleToggle(rolePermission.role, page)
                                }
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                            {isExpanded && hasPermission && (
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-3 z-50 min-w-[160px]">
                                <div className="text-xs font-semibold text-gray-700 mb-2 border-b pb-1">
                                  Ações permitidas:
                                </div>
                                {pagePermission ? (
                                  allActions.map((action) => (
                                    <label
                                      key={action}
                                      className="flex items-center gap-2 py-1.5 hover:bg-gray-50 px-2 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={pagePermission.actions.includes(action)}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleActionToggle(
                                            rolePermission.role,
                                            page,
                                            action
                                          );
                                        }}
                                        disabled={action === 'view'}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {actionLabels[action]}
                                      </span>
                                      {action === 'view' && (
                                        <span className="text-xs text-gray-400 ml-auto">(sempre)</span>
                                      )}
                                    </label>
                                  ))
                                ) : (
                                  <div className="text-xs text-gray-500 italic">
                                    Carregando...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          Sobre as permissões:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Marque as caixas para permitir que cada função acesse determinadas páginas
          </li>
          <li>
            • Clique na seta ao lado do checkbox para configurar ações específicas (Criar, Editar, Excluir)
          </li>
          <li>
            • <strong>Visualizar</strong> está sempre ativo quando a página é permitida
          </li>
          <li>
            • <strong>Criar</strong>: Permite criar novos registros (ex: novo produto, novo cliente)
          </li>
          <li>
            • <strong>Editar</strong>: Permite editar registros existentes
          </li>
          <li>
            • <strong>Excluir</strong>: Permite excluir registros (use com cuidado!)
          </li>
          <li>
            • Usuários sem permissão para uma página não verão o menu correspondente
          </li>
          <li>
            • Botões de editar e excluir ficarão ocultos se o usuário não tiver essas permissões
          </li>
          <li>
            • As alterações só terão efeito após salvar
          </li>
        </ul>
      </div>
    </div>
  );
}
