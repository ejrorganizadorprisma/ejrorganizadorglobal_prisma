import { z } from 'zod';

export enum CommissionSourceType {
  SALE = 'SALE',
  COLLECTION = 'COLLECTION',
}

export enum CommissionEntryStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export interface SellerCommissionConfig {
  id: string;
  sellerId: string;
  commissionOnSales: number; // percentage (e.g. 5.00)
  commissionOnCollections: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  seller?: { id: string; name: string; email: string };
}

export interface CommissionEntry {
  id: string;
  sellerId: string;
  sourceType: CommissionSourceType;
  sourceId: string;
  baseAmount: number; // centavos
  commissionRate: number; // percentage
  commissionAmount: number; // centavos
  status: CommissionEntryStatus;
  settlementId?: string;
  createdAt: string;
  seller?: { id: string; name: string };
}

export interface CommissionSettlement {
  id: string;
  settlementNumber: string;
  sellerId: string;
  totalAmount: number; // centavos
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  seller?: { id: string; name: string };
  entries?: CommissionEntry[];
}

export const UpdateCommissionConfigSchema = z.object({
  commissionOnSales: z.number().min(0).max(100),
  commissionOnCollections: z.number().min(0).max(100),
  active: z.boolean().optional(),
});

export const CreateSettlementSchema = z.object({
  sellerId: z.string().min(1, 'Vendedor é obrigatório'),
  periodStart: z.string().min(1, 'Data inicial é obrigatória'),
  periodEnd: z.string().min(1, 'Data final é obrigatória'),
  notes: z.string().optional(),
});

export interface UpdateCommissionConfigDTO {
  commissionOnSales: number;
  commissionOnCollections: number;
  active?: boolean;
}

export interface CreateSettlementDTO {
  sellerId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface CommissionSummary {
  sellerId: string;
  sellerName: string;
  totalPending: number; // centavos
  totalSettled: number;
  currentMonthEarned: number;
  configSalesRate: number;
  configCollectionsRate: number;
}

export interface CommissionFilters {
  sellerId?: string;
  sourceType?: CommissionSourceType;
  status?: CommissionEntryStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
