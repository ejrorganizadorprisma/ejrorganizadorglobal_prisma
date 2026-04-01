export type PurchaseRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string;
  requestedBy: string;
  requestedByUser?: {
    name: string;
    email: string;
  };
  department?: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  justification?: string;
  requestedDate: string;
  reviewedBy?: string;
  reviewedByUser?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  convertedToPurchaseOrderId?: string;
  convertedAt?: string;
  items?: PurchaseRequestItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  productId: string;
  product?: {
    code: string;
    name: string;
    unit: string;
  };
  quantity: number;
  unitPrice?: number;
  estimatedTotal?: number;
  notes?: string;
  createdAt: string;
}

export interface CreatePurchaseRequestDTO {
  title: string;
  description?: string;
  department?: string;
  priority?: PurchaseRequestPriority;
  justification?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  }>;
}

export interface UpdatePurchaseRequestDTO {
  title?: string;
  description?: string;
  department?: string;
  priority?: PurchaseRequestPriority;
  justification?: string;
}

export interface ReviewPurchaseRequestDTO {
  status: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
}

export interface PurchaseRequestFilters {
  page?: number;
  limit?: number;
  status?: PurchaseRequestStatus;
  priority?: PurchaseRequestPriority;
  requestedBy?: string;
}
