export type FinancialDirection = 'RECEIVABLE' | 'PAYABLE';

export interface FinancialEntry {
  id: string;
  direction: FinancialDirection;
  sourceType: 'SALE' | 'PURCHASE_BUDGET';
  sourceId: string;
  sourceNumber: string;
  installmentNumber: number;
  amount: number; // centavos BRL
  dueDate: string;
  paidDate?: string;
  status: string; // PENDING | PAID | OVERDUE | CANCELLED
  paymentMethod?: string;
  notes?: string;
  entityId?: string;
  entityName: string;
  // Enriched fields for receivables
  customerCreditMaxDays?: number | null;
  customerAllowedPaymentMethods?: string[];
  daysOverdue?: number;
  isCreditExceeded?: boolean;
}

export interface FinancialSummary {
  totalReceivable: number;
  totalPayable: number;
  projectedBalance: number;
  overdueReceivable: number;
  overduePayable: number;
  dueTodayReceivable: number;
  dueTodayPayable: number;
  receivableByStatus: Record<string, { count: number; total: number }>;
  payableByStatus: Record<string, { count: number; total: number }>;
  upcomingEntries: FinancialEntry[];
  overdueEntries: FinancialEntry[];
  // Enhanced fields
  paymentMethodBreakdown?: PaymentMethodBreakdown[];
  receivableAging?: AgingAnalysis;
  payableAging?: AgingAnalysis;
  topDebtors?: Debtor[];
  salesToday?: number;
  revenueTodayTotal?: number;
}

export interface CashFlowDay {
  date: string;
  receivable: number;
  payable: number;
  balance: number;
  cumulativeBalance: number;
}

export interface CashFlowResponse {
  days: CashFlowDay[];
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
}

export interface CalendarDay {
  date: string;
  entries: FinancialEntry[];
  totalReceivable: number;
  totalPayable: number;
}

export interface CalendarResponse {
  month: string;
  days: CalendarDay[];
  monthTotalReceivable: number;
  monthTotalPayable: number;
}

export interface FinancialFilters {
  direction?: FinancialDirection;
  status?: string;
  startDate?: string;
  endDate?: string;
  entityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FinancialListResponse {
  data: FinancialEntry[];
  total: number;
  totals: {
    pending: number;
    paid: number;
    overdue: number;
    cancelled: number;
    total: number;
  };
}

// ---- Aging Analysis ----
export interface AgingAnalysis {
  current: number;       // 0-30 days amount
  days30: number;        // 31-60 days
  days60: number;        // 61-90 days
  days90plus: number;    // 90+ days
  currentCount: number;
  days30Count: number;
  days60Count: number;
  days90plusCount: number;
}

// ---- Payment Method Breakdown ----
export interface PaymentMethodBreakdown {
  method: string;
  totalAmount: number;
  count: number;
  pendingAmount: number;
  paidAmount: number;
}

// ---- Debtor (Devedor) ----
export interface Debtor {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  allowedPaymentMethods: string[];
  creditMaxDays: number | null;
  totalDebt: number;
  overdueAmount: number;
  pendingAmount: number;
  totalSales: number;
  oldestDueDate: string;
  daysOverdue: number;
  creditExpiresInDays: number | null;
  isCreditExceeded: boolean;
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90plus: number;
  };
}

export interface DebtorListResponse {
  data: Debtor[];
  total: number;
  totals: {
    totalDebt: number;
    totalOverdue: number;
    totalPending: number;
    debtorCount: number;
  };
}

export interface DebtorFilters {
  search?: string;
  onlyOverdue?: boolean;
  onlyCreditExceeded?: boolean;
  sortBy?: 'debt' | 'overdue' | 'daysOverdue' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
