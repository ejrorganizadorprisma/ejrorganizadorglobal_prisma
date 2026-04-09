import { z } from 'zod';

// Status possíveis de um Pedido de Venda
export enum SalesOrderStatus {
  DRAFT = 'DRAFT',           // Rascunho (ainda não sincronizado)
  PENDING = 'PENDING',       // Aguardando faturamento
  APPROVED = 'APPROVED',     // Aprovado pelo admin, pronto para virar venda
  CONVERTED = 'CONVERTED',   // Já foi transformado em venda
  CANCELLED = 'CANCELLED',   // Cancelado
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number; // centavos
  discount: number;  // centavos
  total: number;     // centavos
  product?: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  };
}

export interface SalesOrder {
  id: string;
  orderNumber: string; // PED-2026-0001
  customerId: string;
  quoteId?: string;
  sellerId: string;
  status: SalesOrderStatus;
  orderDate: string;
  subtotal: number;  // centavos
  discount: number;  // centavos
  total: number;     // centavos
  notes?: string;
  internalNotes?: string;
  latitude?: number;
  longitude?: number;
  saleId?: string;        // Preenchido após conversão em venda
  convertedAt?: string;
  convertedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  seller?: {
    id: string;
    name: string;
    email: string;
  };
  items?: SalesOrderItem[];
  sale?: {
    id: string;
    saleNumber: string;
  };
}

export const SalesOrderItemInputSchema = z.object({
  itemType: z.enum(['PRODUCT', 'SERVICE']),
  productId: z.string().optional(),
  serviceName: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
});

export const CreateSalesOrderSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  quoteId: z.string().optional(),
  sellerId: z.string().optional(), // Se omitido, usa req.user.id
  orderDate: z.string().min(1, 'Data é obrigatória'),
  items: z.array(SalesOrderItemInputSchema).min(1, 'Adicione ao menos um item'),
  discount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateSalesOrderSchema = z.object({
  status: z.nativeEnum(SalesOrderStatus).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type CreateSalesOrderDTO = z.infer<typeof CreateSalesOrderSchema>;
export type UpdateSalesOrderDTO = z.infer<typeof UpdateSalesOrderSchema>;

export interface SalesOrderFilters {
  customerId?: string;
  sellerId?: string;
  status?: SalesOrderStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
