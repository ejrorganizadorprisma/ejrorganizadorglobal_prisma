// Service Order Status
export type ServiceOrderStatus =
  | 'OPEN'
  | 'AWAITING_PARTS'
  | 'IN_SERVICE'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'CANCELLED';

// Service Order
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  productId: string;
  technicianId?: string;
  status: ServiceOrderStatus;
  isWarranty: boolean;
  issueDescription?: string;
  diagnosis?: string;
  servicePerformed?: string;
  customerNotes?: string;
  internalNotes?: string;
  laborCost: number; // centavos
  partsCost: number; // centavos
  totalCost: number; // centavos
  entryDate: string; // ISO date
  estimatedDelivery?: string; // ISO date
  completionDate?: string; // ISO date
  photos?: string[];
  documents?: string[];
  createdAt: string;
  updatedAt: string;
}

// Service Part
export interface ServicePart {
  id: string;
  serviceOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number; // centavos
  totalCost: number; // centavos
  createdAt: string;
}

// Service Order com relacionamentos expandidos
export interface ServiceOrderWithRelations extends ServiceOrder {
  customer: {
    id: string;
    name: string;
    document: string;
    email?: string;
    phone?: string;
  };
  product: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  technician?: {
    id: string;
    name: string;
    email: string;
  };
  partsUsed: (ServicePart & {
    product: {
      id: string;
      code: string;
      name: string;
    };
  })[];
}

// DTOs
export interface CreateServiceOrderDTO {
  customerId: string;
  productId: string;
  technicianId?: string;
  isWarranty: boolean;
  issueDescription: string;
  customerNotes?: string;
  estimatedDelivery?: string;
}

export interface UpdateServiceOrderDTO {
  technicianId?: string;
  status?: ServiceOrderStatus;
  diagnosis?: string;
  servicePerformed?: string;
  internalNotes?: string;
  laborCost?: number;
  estimatedDelivery?: string;
  completionDate?: string;
  photos?: string[];
  documents?: string[];
}

export interface AddServicePartDTO {
  productId: string;
  quantity: number;
}
