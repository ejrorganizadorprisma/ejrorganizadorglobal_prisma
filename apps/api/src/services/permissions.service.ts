import { db } from '../config/database';
import type { PermissionsConfig, AppPage, UserRole } from '@ejr/shared-types';

// Default permissions (fallback if database is empty)
const DEFAULT_PERMISSIONS: PermissionsConfig = {
  permissions: [
    { role: 'OWNER' as UserRole, pages: ['dashboard', 'overview', 'manufacturing', 'products', 'customers', 'quotes', 'suppliers', 'reports', 'users', 'service_orders', 'stock_reservations', 'purchase_budgets', 'goods_receipts', 'production_orders', 'production_batches', 'my_production', 'storage_locations', 'stock_adjustment', 'document_settings', 'backup', 'sales', 'supplier_orders'] as AppPage[] },
    { role: 'DIRECTOR' as UserRole, pages: ['dashboard', 'overview', 'manufacturing', 'products', 'customers', 'quotes', 'suppliers', 'reports', 'service_orders', 'stock_reservations', 'purchase_budgets', 'goods_receipts', 'production_orders', 'production_batches', 'my_production', 'storage_locations', 'stock_adjustment', 'document_settings', 'backup', 'supplier_orders'] as AppPage[] },
    { role: 'MANAGER' as UserRole, pages: ['products', 'service_orders', 'stock_reservations', 'purchase_budgets', 'goods_receipts', 'production_orders', 'production_batches', 'my_production', 'storage_locations', 'backup', 'supplier_orders', 'stock_adjustment'] as AppPage[] },
    { role: 'COORDINATOR' as UserRole, pages: ['manufacturing', 'production_orders', 'production_batches', 'my_production', 'reports', 'products'] as AppPage[] },
    { role: 'SALESPERSON' as UserRole, pages: ['customers', 'quotes'] as AppPage[] },
    { role: 'STOCK' as UserRole, pages: ['products', 'stock_reservations', 'goods_receipts', 'storage_locations', 'stock_adjustment', 'purchase_budgets'] as AppPage[] },
    { role: 'PRODUCTION' as UserRole, pages: ['my_production', 'products', 'purchase_budgets', 'storage_locations', 'goods_receipts'] as AppPage[] },
    { role: 'TECHNICIAN' as UserRole, pages: ['service_orders'] as AppPage[] },
    { role: 'MONITOR' as UserRole, pages: ['reports'] as AppPage[] },
  ],
};

export class PermissionsService {
  async getPermissions(): Promise<PermissionsConfig> {
    try {
      const result = await db.query('SELECT config FROM permissions_config ORDER BY updated_at DESC LIMIT 1');
      if (result.rows.length > 0) {
        return result.rows[0].config as PermissionsConfig;
      }
    } catch (error) {
      console.error('Error reading permissions from DB, using defaults:', error);
    }
    return DEFAULT_PERMISSIONS;
  }

  async updatePermissions(config: PermissionsConfig): Promise<PermissionsConfig> {
    const result = await db.query('SELECT id FROM permissions_config LIMIT 1');
    if (result.rows.length > 0) {
      await db.query(
        'UPDATE permissions_config SET config = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(config), result.rows[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO permissions_config (config) VALUES ($1)',
        [JSON.stringify(config)]
      );
    }
    return config;
  }

  async getPermissionsForRole(role: UserRole): Promise<AppPage[]> {
    const config = await this.getPermissions();
    const rolePermissions = config.permissions.find(p => p.role === role);
    return rolePermissions?.pages || [];
  }

  async hasPermission(role: UserRole, page: AppPage): Promise<boolean> {
    const pages = await this.getPermissionsForRole(role);
    return pages.includes(page);
  }
}
