export enum SaleStatus {
  PENDING = 'PENDING', // Aguardando pagamento
  PAID = 'PAID', // Pago
  PARTIAL = 'PARTIAL', // Parcialmente pago
  OVERDUE = 'OVERDUE', // Atrasado
  CANCELLED = 'CANCELLED', // Cancelado
}

export enum PaymentMethod {
  CASH = 'CASH', // Dinheiro
  CREDIT = 'CREDIT', // Crédito (crediário/fiado — pagamento a prazo)
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

// Frete / logística
export enum ShippingMethod {
  PICKUP = 'PICKUP',     // Retirada no balcão
  DELIVERY = 'DELIVERY', // Entrega própria
  CARRIER = 'CARRIER',   // Transportadora
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}

// Estágio operacional da venda no fluxo de chão de fábrica (independente do
// status financeiro SaleStatus). Preenchido a partir da Conferência.
export enum FulfillmentStatus {
  CONFERRED = 'CONFERRED',           // Conferido (venda recém-criada pela conferência)
  IN_EXPEDITION = 'IN_EXPEDITION',   // Em Expedição (faturada, NF lançada)
  AWAITING_CARRIER = 'AWAITING_CARRIER', // Aguardando Transportadora (volumes/atados + coleta agendada)
  COLLECTED = 'COLLECTED',           // Coletado pela transportadora
}

export interface DeliveryAddress {
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state?: string;
  zipCode?: string;
  reference?: string;
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
  salesOrderId?: string; // Referência ao Pedido que originou esta venda
  sellerId?: string; // Vendedor responsável (dono da comissão) — pode diferir de createdBy
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
  // Frete / logística (preenchido por quem fatura)
  shippingMethod?: ShippingMethod;
  shippingCost?: number; // centavos
  carrierName?: string;
  trackingCode?: string;
  deliveryAddress?: DeliveryAddress;
  deliveryStatus?: DeliveryStatus;
  deliveredAt?: string;
  shippingNotes?: string;
  // Fluxo de expedição (chão de fábrica)
  fulfillmentStatus?: FulfillmentStatus;
  // Nota Fiscal de saída (apenas registro; integração fiscal PY virá depois)
  nfNumber?: string;
  nfDate?: string;
  nfAmount?: number; // centavos
  nfFileUrl?: string;
  nfFileName?: string;
  invoicedAt?: string;
  invoicedBy?: string;
  // Expedição
  carrierId?: string;
  carrierScheduledDate?: string;
  volumesCount?: number;
  bundlesCount?: number; // atados
  expeditionNotes?: string;
  expeditionConferredBy?: string;
  expeditionConferredAt?: string;
  // Coleta pela transportadora
  collectedAt?: string;
  collectedBy?: string;
  collectionDriverName?: string;
  collectionCarrierVolumes?: number;
  collectionReceiptUrl?: string;
  collectionReceiptName?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Populated fields
  carrier?: {
    id: string;
    name: string;
  };
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
  seller?: {
    id: string;
    name: string;
    email: string;
  };
  salesOrder?: {
    id: string;
    orderNumber: string;
  };
}

export interface CreateSaleDTO {
  customerId: string;
  quoteId?: string;
  salesOrderId?: string; // Quando a venda é criada a partir de um pedido
  sellerId?: string;     // Vendedor que receberá comissão (se omitido, = createdBy)
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
  // Frete / logística
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  carrierName?: string;
  trackingCode?: string;
  deliveryAddress?: DeliveryAddress;
  deliveryStatus?: DeliveryStatus;
  shippingNotes?: string;
}

export interface UpdateSaleDTO {
  status?: SaleStatus;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
  // Frete / logística (atualização isolada da entrega)
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  carrierName?: string;
  trackingCode?: string;
  deliveryAddress?: DeliveryAddress;
  deliveryStatus?: DeliveryStatus;
  deliveredAt?: string;
  shippingNotes?: string;
}

// Faturamento: lança a NF de saída e (opcionalmente) a transportadora.
export interface InvoiceSaleDTO {
  nfNumber: string;
  nfDate?: string;
  nfAmount?: number; // centavos
  carrierId?: string; // opcional no faturamento
}

// Expedição: conferência final + volumes/atados + transportadora (obrigatória) + coleta agendada.
export interface ExpeditionSaleDTO {
  carrierId: string; // obrigatório na expedição
  carrierScheduledDate?: string;
  volumesCount: number;
  bundlesCount?: number; // atados
  expeditionNotes?: string;
  employeeCode?: string; // quando identificação por código
}

// Coleta: transportadora retirou a mercadoria (recibo + motorista + volumes).
export interface CollectSaleDTO {
  driverName?: string;
  collectionCarrierVolumes?: number;
  employeeCode?: string;
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
  fulfillmentStatus?: FulfillmentStatus;
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
