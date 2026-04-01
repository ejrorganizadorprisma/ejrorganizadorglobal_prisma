import { z } from 'zod';
import { UserRole } from './user';

// Available pages/routes in the application
export enum AppPage {
  DASHBOARD = 'dashboard',
  OVERVIEW = 'overview',
  MANUFACTURING = 'manufacturing',
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  QUOTES = 'quotes',
  SALES = 'sales',
  SUPPLIERS = 'suppliers',
  REPORTS = 'reports',
  USERS = 'users',
  SERVICE_ORDERS = 'service_orders',
  STOCK_RESERVATIONS = 'stock_reservations',
  PURCHASE_ORDERS = 'purchase_orders',
  SUPPLIER_ORDERS = 'supplier_orders',
  PURCHASE_REQUESTS = 'purchase_requests',
  GOODS_RECEIPTS = 'goods_receipts',
  PRODUCTION_ORDERS = 'production_orders',
  STORAGE_LOCATIONS = 'storage_locations',
  STOCK_ADJUSTMENT = 'stock_adjustment',
  DOCUMENT_SETTINGS = 'document_settings',
  BACKUP = 'backup',
  PRODUCTION_BATCHES = 'production_batches',
  MY_PRODUCTION = 'my_production',
  DIGITAL_FABRICATION = 'digital_fabrication',
  PURCHASE_BUDGETS = 'purchase_budgets',
}

// Available actions for each page
export enum PageAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  CONVERT = 'convert', // Converter requisições em ordens de compra
  APPROVE = 'approve',
  PURCHASE = 'purchase',
}

// Permissions for a specific page
export interface PagePermissions {
  page: AppPage;
  actions: PageAction[];
}

// Permission configuration for a role
export interface RolePermissions {
  role: UserRole;
  pages: AppPage[]; // For backward compatibility - pages the user can access
  pagePermissions?: PagePermissions[]; // Granular permissions per page
}

// Complete permissions configuration
export interface PermissionsConfig {
  permissions: RolePermissions[];
}

export const PagePermissionsSchema = z.object({
  page: z.nativeEnum(AppPage),
  actions: z.array(z.nativeEnum(PageAction)),
});

export const RolePermissionsSchema = z.object({
  role: z.nativeEnum(UserRole),
  pages: z.array(z.nativeEnum(AppPage)),
  pagePermissions: z.array(PagePermissionsSchema).optional(),
});

export const PermissionsConfigSchema = z.object({
  permissions: z.array(RolePermissionsSchema),
});

export type PagePermissionsDTO = z.infer<typeof PagePermissionsSchema>;
export type RolePermissionsDTO = z.infer<typeof RolePermissionsSchema>;
export type PermissionsConfigDTO = z.infer<typeof PermissionsConfigSchema>;
