import { z } from 'zod';

// Status possíveis de um Pedido de Venda
export enum SalesOrderStatus {
  DRAFT = 'DRAFT',                                 // Rascunho (ainda não sincronizado)
  PENDING = 'PENDING',                             // 1. Pedido de venda (vendedor criou)
  RECEIVED = 'RECEIVED',                           // 2. Pedido recebido (legado)
  AWAITING_SEPARATION = 'AWAITING_SEPARATION',     // 2b. Liberado p/ separação (fila do estoque, sem responsável)
  SEPARATING = 'SEPARATING',                       // 2c. Em separação (travado; responsável assumiu)
  SEPARATED = 'SEPARATED',                         // 3. Pedido separado (depósito separou)
  APPROVED = 'APPROVED',                           // 4. Venda autorizada (Candy conferiu)
  CONVERTING = 'CONVERTING',                       // Lock otimista: faturamento em andamento (transitório)
  PARTIALLY_CONVERTED = 'PARTIALLY_CONVERTED',     // Faturado parcialmente; saldo aguarda novo convertToSale
  CONVERTED = 'CONVERTED',                         // 5. Faturado (virou venda)
  TO_DELIVER = 'TO_DELIVER',                       // 6. Venda a entregar (no depósito)
  DELIVERED = 'DELIVERED',                         // 7. Venda entregue (cliente ou transportadora)
  COMPLETED = 'COMPLETED',                         // 8. Venda concluída
  CANCELLED = 'CANCELLED',                         // Cancelado
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
  // Separação
  quantitySeparated?: number;
  separationStatus?: 'OK' | 'PARTIAL' | 'MISSING';
  separationNote?: string; // justificativa quando falta (MISSING/PARTIAL)
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
  separationForecastDate?: string; // Previsão de Separação: data estimada p/ ir à separação
  subtotal: number;  // centavos
  discount: number;  // centavos
  total: number;     // centavos
  notes?: string;
  internalNotes?: string;
  latitude?: number;
  longitude?: number;
  saleId?: string;        // Preenchido após PRIMEIRA conversão em venda (histórico completo em sales_order_conversions)
  pendingOriginOrderId?: string; // Se preenchido, é um "Pedido de Venda | Pendência" gerado do saldo de outro pedido
  pendingOriginNumber?: string;  // Número do pedido de origem (exibição/hover)
  convertedAt?: string;
  convertedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  // Separação (chão de estoque)
  releasedForSeparationAt?: string;
  releasedBy?: string;
  separationClaimedBy?: string;
  separationClaimedAt?: string;
  separatedBy?: string;
  separatedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  separationResponsible?: {
    id: string;
    name: string;
  };
  separationEvents?: SeparationEvent[];
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

/**
 * Evento do fluxo de separação (histórico p/ avaliação de funcionários).
 */
export interface SeparationEvent {
  id: string;
  salesOrderId: string;
  userId?: string;
  action: 'CLAIMED' | 'POSTPONED' | 'COMPLETED' | 'CONFERRED' | 'RELEASED' | 'RETURNED';
  note?: string;
  createdAt: string;
  // Populated
  user?: { id: string; name: string };
}

// Item enviado ao "Tudo Separado".
export const SeparateItemInputSchema = z.object({
  id: z.string().min(1),
  quantitySeparated: z.number().int().min(0),
  separationStatus: z.enum(['OK', 'PARTIAL', 'MISSING']),
  separationNote: z.string().optional().nullable(),
});
export const SeparateOrderSchema = z.object({
  items: z.array(SeparateItemInputSchema).min(1),
});
export type SeparateItemInput = z.infer<typeof SeparateItemInputSchema>;
export type SeparateOrderDTO = z.infer<typeof SeparateOrderSchema>;

// Assumir a separação (claim). employeeCode só quando identificação por código.
export const ClaimSeparationSchema = z.object({
  employeeCode: z.string().optional(),
});
export type ClaimSeparationDTO = z.infer<typeof ClaimSeparationSchema>;

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
  separationForecastDate: z.string().optional().nullable(),
  items: z.array(SalesOrderItemInputSchema).min(1, 'Adicione ao menos um item'),
  discount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateSalesOrderSchema = z.object({
  customerId: z.string().min(1).optional(),
  orderDate: z.string().optional(),
  separationForecastDate: z.string().optional().nullable(),
  items: z.array(SalesOrderItemInputSchema).min(1).optional(),
  discount: z.number().int().min(0).optional(),
  status: z.nativeEnum(SalesOrderStatus).optional(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
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

/**
 * Linha do histórico de faturamentos parciais (sales_order_conversions).
 * Cada conversão (parcial ou total) gera uma linha apontando para a Sale criada.
 */
export interface SalesOrderConversion {
  id: string;
  salesOrderId: string;
  saleId: string;
  itemsSnapshot: Array<{
    itemType: 'PRODUCT' | 'SERVICE';
    productId?: string;
    serviceName?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
  convertedAt: string;
  convertedBy?: string;
  // Populated
  sale?: {
    id: string;
    saleNumber: string;
  };
}

/**
 * Forecast de comissão para um vendedor baseado em pedidos PENDING/APPROVED.
 */
export interface CommissionForecast {
  pendingOrders: number;
  totalSubtotal: number;          // soma dos subtotals dos pedidos
  forecastedCommission: number;   // comissão prevista (centavos)
  byOrder: Array<{
    orderId: string;
    orderNumber: string;
    subtotal: number;
    forecastedAmount: number;
  }>;
}

/**
 * Token de push para um dispositivo (Expo Push API).
 */
export interface DevicePushToken {
  id: string;
  userId: string;
  expoToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}
