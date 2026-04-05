import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import type { AppPage, PageAction } from '@ejr/shared-types';

// Map routes to AppPage enum values
const routeToPageMap: Record<string, AppPage> = {
  '/dashboard': 'dashboard' as AppPage,
  '/overview': 'overview' as AppPage,
  '/manufacturing': 'manufacturing' as AppPage,
  '/products': 'products' as AppPage,
  '/products/new': 'products' as AppPage,
  '/customers': 'customers' as AppPage,
  '/customers/new': 'customers' as AppPage,
  '/quotes': 'quotes' as AppPage,
  '/quotes/new': 'quotes' as AppPage,
  '/suppliers': 'suppliers' as AppPage,
  '/suppliers/new': 'suppliers' as AppPage,
  '/reports': 'reports' as AppPage,
  '/users': 'users' as AppPage,
  '/users/new': 'users' as AppPage,
  '/service-orders': 'service_orders' as AppPage,
  '/service-orders/new': 'service_orders' as AppPage,
  '/stock-reservations': 'stock_reservations' as AppPage,
  '/purchase-budgets': 'purchase_budgets' as AppPage,
  '/purchase-budgets/new': 'purchase_budgets' as AppPage,
  '/purchase-budgets/delegations': 'purchase_budgets' as AppPage,
  '/supplier-orders': 'supplier_orders' as AppPage,
  '/goods-receipts': 'goods_receipts' as AppPage,
  '/goods-receipts/new': 'goods_receipts' as AppPage,
  '/production-orders': 'production_orders' as AppPage,
  '/production-orders/new': 'production_orders' as AppPage,
  '/production-batches': 'production_batches' as AppPage,
  '/production-batches/new': 'production_batches' as AppPage,
  '/my-production': 'my_production' as AppPage,
  '/storage-locations': 'storage_locations' as AppPage,
  '/storage-locations/new': 'storage_locations' as AppPage,
  '/stock-adjustment': 'stock_adjustment' as AppPage,
  '/permissions': 'users' as AppPage, // Permissions is part of user management
  '/settings/document-settings': 'document_settings' as AppPage,
  '/backup': 'backup' as AppPage,
  '/sellers': 'sellers' as AppPage,
  '/financial': 'sales' as AppPage,
  '/financial/calendar': 'sales' as AppPage,
  '/financial/receivables': 'sales' as AppPage,
  '/financial/payables': 'sales' as AppPage,
};

export function usePagePermissions() {
  const { user } = useAuth();
  const { data: permissionsData, isLoading } = usePermissions();

  const userPages = useMemo(() => {
    if (!user || !permissionsData) return [];

    const rolePermission = permissionsData.permissions.find(
      (p) => p.role === user.role
    );

    return rolePermission?.pages || [];
  }, [user, permissionsData]);

  const userPagePermissions = useMemo(() => {
    if (!user || !permissionsData) return [];

    const rolePermission = permissionsData.permissions.find(
      (p) => p.role === user.role
    );

    return rolePermission?.pagePermissions || [];
  }, [user, permissionsData]);

  const hasPermission = (page: AppPage): boolean => {
    // If permissions are still loading or not configured, allow access
    if (isLoading || !permissionsData) return true;

    // OWNER always has all permissions
    if (user?.role === 'OWNER') return true;

    return userPages.includes(page);
  };

  const hasActionPermission = (page: AppPage, action: PageAction): boolean => {
    // If permissions are still loading or not configured, allow access
    if (isLoading || !permissionsData) return true;

    // OWNER always has all permissions
    if (user?.role === 'OWNER') return true;

    // Find permissions for this specific page
    const pagePermission = userPagePermissions.find((p) => p.page === page);

    // If no granular permissions configured, fall back to page access
    if (!pagePermission) {
      // If user has page access, allow VIEW by default
      if (action === 'view') {
        return userPages.includes(page);
      }
      // For other actions, deny by default
      return false;
    }

    return pagePermission.actions.includes(action);
  };

  const hasRoutePermission = (route: string): boolean => {
    // Extract base route (remove IDs and edit segments)
    const baseRoute = route
      .replace(/\/\d+$/, '') // Remove trailing IDs
      .replace(/\/\d+\/edit$/, '') // Remove /ID/edit
      .replace(/\/edit$/, ''); // Remove /edit

    const page = routeToPageMap[baseRoute];

    // If route not mapped, default to allowing access
    if (!page) return true;

    return hasPermission(page);
  };

  return {
    hasPermission,
    hasActionPermission,
    hasRoutePermission,
    userPages,
    userPagePermissions,
    isLoading,
  };
}
