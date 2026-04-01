export type PurchaseBudgetStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'PURCHASED'
  | 'RECEIVED'
  | 'CANCELLED';

export type BudgetPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AdditionalCost {
  id: string;
  name: string;
  percentage: number;
}

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
}

export interface PurchaseBudget {
  id: string;
  budgetNumber: string;
  title: string;
  description?: string;
  justification?: string;
  priority: BudgetPriority;
  department?: string;
  supplierId?: string;
  supplierName?: string;
  status: PurchaseBudgetStatus;
  totalAmount: number;
  approvedBy?: string;
  approvedByUser?: { name: string; email: string };
  approvedAt?: string;
  rejectionReason?: string;
  purchasedBy?: string;
  purchasedByUser?: { name: string; email: string };
  purchasedAt?: string;
  invoiceNumber?: string;
  finalAmount?: number;
  paymentMethod?: string;
  paymentInstallments?: PaymentInstallment[];
  paymentTerms?: string;
  leadTimeDays?: number;
  currency?: string;
  exchangeRate1?: number;
  exchangeRate2?: number;
  exchangeRate3?: number;
  additionalCosts?: AdditionalCost[];
  manufacturers?: string[];
  createdBy: string;
  createdByUser?: { name: string; email: string };
  items?: PurchaseBudgetItem[];
  purchaseOrder?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBudgetItem {
  id: string;
  budgetId: string;
  productId?: string;
  productName: string;
  factoryCode?: string;
  quantity: number;
  unit: string;
  notes?: string;
  selectedQuoteId?: string;
  quotes?: PurchaseBudgetQuote[];
  createdAt: string;
}

export interface PurchaseBudgetQuote {
  id: string;
  itemId: string;
  supplierId: string;
  supplierName?: string;
  unitPrice: number;
  leadTimeDays?: number;
  paymentTerms?: string;
  validityDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ApprovalDelegation {
  id: string;
  delegatedBy: string;
  delegatedByUser?: { name: string; email: string };
  delegatedTo: string;
  delegatedToUser?: { name: string; email: string };
  startDate: string;
  endDate: string;
  isActive: boolean;
  revokedAt?: string;
  createdAt: string;
}

export interface CreatePurchaseBudgetDTO {
  title: string;
  description?: string;
  justification?: string;
  priority?: BudgetPriority;
  department?: string;
  supplierId?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  currency?: string;
  exchangeRate1?: number;
  exchangeRate2?: number;
  exchangeRate3?: number;
  additionalCosts?: AdditionalCost[];
  manufacturers?: string[];
  items?: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

export interface UpdatePurchaseBudgetDTO {
  title?: string;
  description?: string;
  justification?: string;
  priority?: BudgetPriority;
  department?: string;
  supplierId?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  currency?: string;
  exchangeRate1?: number;
  exchangeRate2?: number;
  exchangeRate3?: number;
  additionalCosts?: AdditionalCost[];
  manufacturers?: string[];
}

export interface CreateBudgetItemDTO {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface UpdateBudgetItemDTO {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface CreateBudgetQuoteDTO {
  supplierId: string;
  unitPrice: number;
  leadTimeDays?: number;
  paymentTerms?: string;
  validityDate?: string;
  notes?: string;
}

export interface UpdateBudgetQuoteDTO {
  unitPrice?: number;
  leadTimeDays?: number;
  paymentTerms?: string;
  validityDate?: string;
  notes?: string;
}

export interface PurchaseBudgetFilters {
  page?: number;
  limit?: number;
  status?: PurchaseBudgetStatus;
  priority?: BudgetPriority;
  supplierId?: string;
  createdBy?: string;
  search?: string;
}

export interface CreateApprovalDelegationDTO {
  delegatedTo: string;
  startDate: string;
  endDate: string;
}
