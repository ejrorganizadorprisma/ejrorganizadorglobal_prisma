import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// TypeScript interfaces
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  minimumOrderValue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  rating?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierAddress {
  id: string;
  supplierId: string;
  type: 'BILLING' | 'SHIPPING' | 'BOTH';
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface SupplierContact {
  id: string;
  supplierId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
}

export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku?: string;
  unitPrice: number;
  minimumQuantity: number;
  leadTimeDays: number;
  isPreferred: boolean;
  lastPurchasePrice?: number;
  lastPurchaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FindManyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

// Supplier CRUD hooks
export function useSuppliers(params: FindManyParams = {}) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const { data } = await api.get('/suppliers', { params });
      return data;
    },
  });
}

export function useSupplier(id?: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${id}`);
      return data.data as Supplier;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierData: Partial<Supplier>) => {
      const { data } = await api.post('/suppliers', supplierData);
      return data.data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: supplierData }: { id: string; data: Partial<Supplier> }) => {
      const { data } = await api.patch(`/suppliers/${id}`, supplierData);
      return data.data as Supplier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

// Supplier Address hooks
export function useSupplierAddresses(supplierId?: string) {
  return useQuery({
    queryKey: ['suppliers', supplierId, 'addresses'],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${supplierId}/addresses`);
      return data.data as SupplierAddress[];
    },
    enabled: !!supplierId,
  });
}

export function useCreateSupplierAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data: addressData }: { supplierId: string; data: Partial<SupplierAddress> }) => {
      const { data } = await api.post(`/suppliers/${supplierId}/addresses`, addressData);
      return data.data as SupplierAddress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'addresses'] });
    },
  });
}

export function useUpdateSupplierAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, addressId, data: addressData }: { supplierId: string; addressId: string; data: Partial<SupplierAddress> }) => {
      const { data } = await api.patch(`/suppliers/${supplierId}/addresses/${addressId}`, addressData);
      return data.data as SupplierAddress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'addresses'] });
    },
  });
}

export function useDeleteSupplierAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, addressId }: { supplierId: string; addressId: string }) => {
      await api.delete(`/suppliers/${supplierId}/addresses/${addressId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'addresses'] });
    },
  });
}

// Supplier Contact hooks
export function useSupplierContacts(supplierId?: string) {
  return useQuery({
    queryKey: ['suppliers', supplierId, 'contacts'],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${supplierId}/contacts`);
      return data.data as SupplierContact[];
    },
    enabled: !!supplierId,
  });
}

export function useCreateSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data: contactData }: { supplierId: string; data: Partial<SupplierContact> }) => {
      const { data } = await api.post(`/suppliers/${supplierId}/contacts`, contactData);
      return data.data as SupplierContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'contacts'] });
    },
  });
}

export function useUpdateSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, contactId, data: contactData }: { supplierId: string; contactId: string; data: Partial<SupplierContact> }) => {
      const { data } = await api.patch(`/suppliers/${supplierId}/contacts/${contactId}`, contactData);
      return data.data as SupplierContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'contacts'] });
    },
  });
}

export function useDeleteSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, contactId }: { supplierId: string; contactId: string }) => {
      await api.delete(`/suppliers/${supplierId}/contacts/${contactId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.supplierId, 'contacts'] });
    },
  });
}

// Supplier Products hooks
export function useSupplierProducts(supplierId?: string) {
  return useQuery({
    queryKey: ['suppliers', supplierId, 'products'],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${supplierId}/products`);
      return data.data as ProductSupplier[];
    },
    enabled: !!supplierId,
  });
}
