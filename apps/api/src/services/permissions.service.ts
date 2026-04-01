import { promises as fs } from 'fs';
import { join } from 'path';
import type { PermissionsConfig, RolePermissions, AppPage, UserRole } from '@ejr/shared-types';

const PERMISSIONS_FILE = join(process.cwd(), 'data', 'permissions.json');

// Default permissions for each role
const DEFAULT_PERMISSIONS: PermissionsConfig = {
  permissions: [
    {
      role: 'OWNER' as UserRole,
      pages: [
        'dashboard', 'overview', 'manufacturing', 'products', 'customers',
        'quotes', 'suppliers', 'reports', 'users', 'service_orders',
        'stock_reservations', 'purchase_orders', 'goods_receipts', 'production_orders',
        'storage_locations', 'stock_adjustment', 'document_settings', 'backup'
      ] as AppPage[],
    },
    {
      role: 'DIRECTOR' as UserRole,
      pages: [
        'dashboard', 'overview', 'manufacturing', 'products', 'customers',
        'quotes', 'suppliers', 'reports', 'service_orders',
        'stock_reservations', 'purchase_orders', 'goods_receipts', 'production_orders',
        'storage_locations', 'stock_adjustment', 'document_settings', 'backup'
      ] as AppPage[],
    },
    {
      role: 'MANAGER' as UserRole,
      pages: [
        'dashboard', 'overview', 'products', 'customers',
        'quotes', 'suppliers', 'reports', 'service_orders'
      ] as AppPage[],
    },
    {
      role: 'COORDINATOR' as UserRole,
      pages: [
        'dashboard', 'manufacturing', 'production_orders', 'reports'
      ] as AppPage[],
    },
    {
      role: 'SALESPERSON' as UserRole,
      pages: ['dashboard', 'customers', 'quotes'] as AppPage[],
    },
    {
      role: 'STOCK' as UserRole,
      pages: [
        'dashboard', 'products', 'stock_reservations', 'goods_receipts',
        'storage_locations', 'stock_adjustment'
      ] as AppPage[],
    },
    {
      role: 'PRODUCTION' as UserRole,
      pages: ['dashboard', 'manufacturing', 'production_orders', 'products'] as AppPage[],
    },
    {
      role: 'TECHNICIAN' as UserRole,
      pages: ['dashboard', 'service_orders'] as AppPage[],
    },
    {
      role: 'MONITOR' as UserRole,
      pages: ['dashboard', 'reports'] as AppPage[],
    },
  ],
};

export class PermissionsService {
  private async ensurePermissionsFile(): Promise<void> {
    try {
      await fs.access(PERMISSIONS_FILE);
    } catch {
      // File doesn't exist, create it with default permissions
      const dataDir = join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(PERMISSIONS_FILE, JSON.stringify(DEFAULT_PERMISSIONS, null, 2));
    }
  }

  async getPermissions(): Promise<PermissionsConfig> {
    await this.ensurePermissionsFile();
    const data = await fs.readFile(PERMISSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  }

  async updatePermissions(config: PermissionsConfig): Promise<PermissionsConfig> {
    await this.ensurePermissionsFile();
    await fs.writeFile(PERMISSIONS_FILE, JSON.stringify(config, null, 2));
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
