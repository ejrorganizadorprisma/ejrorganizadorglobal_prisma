// User & Auth
export * from './models/user';

// Product
export * from './models/product';
export * from './models/product-part';
export * from './models/product-supplier';

// Customer
export * from './models/customer';

// Quote
export * from './models/quote';

// Service Order
export * from './models/service-order';

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
