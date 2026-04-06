import { z } from 'zod';

export enum CollectionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  DEPOSITED = 'DEPOSITED',
  REJECTED = 'REJECTED',
}

export enum CollectionPaymentMethod {
  CHECK = 'CHECK',
  CASH = 'CASH',
  PIX = 'PIX',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export interface Collection {
  id: string;
  collectionNumber: string;
  saleId: string;
  customerId: string;
  sellerId: string;
  amount: number; // centavos
  paymentMethod: CollectionPaymentMethod;
  status: CollectionStatus;
  checkNumber?: string;
  checkBank?: string;
  checkDate?: string;
  photoUrls?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  customer?: { id: string; name: string };
  seller?: { id: string; name: string };
  sale?: { id: string; saleNumber: string; total: number; totalPaid: number };
}

export const CreateCollectionSchema = z.object({
  saleId: z.string().min(1, 'Venda é obrigatória'),
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  amount: z.number().int().positive('Valor deve ser maior que zero'),
  paymentMethod: z.nativeEnum(CollectionPaymentMethod),
  checkNumber: z.string().optional(),
  checkBank: z.string().optional(),
  checkDate: z.string().optional(),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateCollectionSchema = z.object({
  status: z.nativeEnum(CollectionStatus).optional(),
  rejectedReason: z.string().optional(),
  notes: z.string().optional(),
});

export interface CreateCollectionDTO {
  saleId: string;
  customerId: string;
  amount: number;
  paymentMethod: CollectionPaymentMethod;
  checkNumber?: string;
  checkBank?: string;
  checkDate?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  photoUrls?: string[];
}

export interface CollectionFilters {
  sellerId?: string;
  customerId?: string;
  saleId?: string;
  status?: CollectionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CollectionStats {
  totalCollected: number;
  pendingApproval: number;
  approved: number;
  deposited: number;
  rejected: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  depositedAmount: number;
}
