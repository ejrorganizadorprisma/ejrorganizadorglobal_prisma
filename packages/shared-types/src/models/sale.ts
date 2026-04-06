export enum SaleStatus {
  PENDING = 'PENDING', // Aguardando pagamento
  PAID = 'PAID', // Pago
  PARTIAL = 'PARTIAL', // Parcialmente pago
  OVERDUE = 'OVERDUE', // Atrasado
  CANCELLED = 'CANCELLED', // Cancelado
}

export enum PaymentMethod {
  CASH = 'CASH', // Dinheiro
  CREDIT_CARD = 'CREDIT_CARD', // Cartão de crédito
  DEBIT_CARD = 'DEBIT_CARD', // Cartão de débito
  BANK_TRANSFER = 'BANK_TRANSFER', // Transferência bancária
  PIX = 'PIX', // PIX
  CHECK = 'CHECK', // Cheque
  PROMISSORY = 'PROMISSORY', // Nota promissória
  BOLETO = 'BOLETO', // Boleto bancário
  OTHER = 'OTHER', // Outro
}

export enum PaymentStatus {
  PENDING = 'PENDING', // Pendente
  PAID = 'PAID', // Pago
  OVERDUE = 'OVERDUE', // Atrasado
  CANCELLED = 'CANCELLED', // Cancelado
}

export interface SaleItem {
  id: string;
  saleId: string;
  itemType: 'PRODUCT' | 'SERVICE';
  productId?: string; // Obrigatório se itemType = PRODUCT
  serviceName?: string; // Obrigatório se itemType = SERVICE
  serviceDescription?: string;
  quantity: number;
  unitPrice: number; // centavos
  discount: number; // centavos
  total: number; // centavos
  product?: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  };
}

export interface SalePayment {
  id: string;
  saleId: string;
  installmentNumber: number; // Número da parcela (1, 2, 3...)
  paymentMethod: PaymentMethod;
  amount: number; // centavos
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string; // VND-0001, VND-0002...
  customerId: string;
  quoteId?: string; // Referência ao orçamento (se foi convertido)
  status: SaleStatus;
  saleDate: string;
  dueDate?: string;
  subtotal: number; // centavos
  discount: number; // centavos
  total: number; // centavos
  totalPaid: number; // centavos
  totalPending: number; // centavos
  installments: number; // Número de parcelas
  notes?: string;
  internalNotes?: string;
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
  items?: SaleItem[];
  payments?: SalePayment[];
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateSaleDTO {
  customerId: string;
  quoteId?: string;
  saleDate: string;
  dueDate?: string;
  items: Array<{
    itemType: 'PRODUCT' | 'SERVICE';
    productId?: string;
    serviceName?: string;
    serviceDescription?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  discount?: number;
  installments?: number; // Número de parcelas
  paymentMethod: PaymentMethod;
  notes?: string;
  internalNotes?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateSaleDTO {
  status?: SaleStatus;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
}

export interface CreateSalePaymentDTO {
  installmentNumber: number;
  paymentMethod: PaymentMethod;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface UpdateSalePaymentDTO {
  paidDate?: string;
  status?: PaymentStatus;
  notes?: string;
}

export interface SaleFilters {
  customerId?: string;
  status?: SaleStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sellerId?: string;
}

export interface SaleStats {
  totalSales: number;
  totalRevenue: number; // centavos
  totalPaid: number; // centavos
  totalPending: number; // centavos
  totalOverdue: number; // centavos
  averageTicket: number; // centavos
  salesByStatus: Record<SaleStatus, number>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalRevenue: number;
    salesCount: number;
  }>;
}
