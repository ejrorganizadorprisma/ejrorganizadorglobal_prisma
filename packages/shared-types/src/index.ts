// User & Auth
export * from './models/user';
export * from './models/permissions';

// Product
export * from './models/product';
export * from './models/product-part';
export * from './models/product-supplier';
export * from './models/product-category';
export * from './models/product-family';
export * from './models/storage-location';

// Customer
export * from './models/customer';

// Service
export * from './models/service';

// Quote
export * from './models/quote';

// Sale
export * from './models/sale';

// Sales Order (Pedido de Venda)
export * from './models/sales-order';

// Purchase Request
export * from './models/purchase-request';

// Service Order
export * from './models/service-order';

// Document Settings
export * from './models/document-settings';

// System Settings
export * from './models/system-settings';

// Production Batch (Lotes de Produção)
export * from './models/production-batch';

// Digital Fabrication (Fabricação 3D e Laser)
export * from './models/digital-fabrication';

// Purchase Budget (Orçamento de Compra)
export * from './models/purchase-budget';

// Financial (Financeiro)
export * from './models/financial';

// Collection (Cobrança)
export * from './models/collection';

// Commission (Comissão)
export * from './models/commission';

// GPS
export * from './models/gps';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
