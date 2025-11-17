import { supabase } from '../config/supabase';
import { randomUUID } from 'node:crypto';

// Interface Supplier com todos os campos da tabela
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

export interface CreateSupplierDTO {
  code?: string; // Optional - auto-generated if not provided
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  minimumOrderValue?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  rating?: number;
  notes?: string;
}

export interface UpdateSupplierDTO {
  code?: string;
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  minimumOrderValue?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  rating?: number;
  notes?: string;
}

export class SuppliersRepository {
  // Conversão snake_case → camelCase para Supplier
  private mapSupplier(data: any): Supplier {
    return {
      id: data.id,
      code: data.document, // Map document field to code in application
      name: data.name,
      legalName: data.legal_name || undefined,
      taxId: data.tax_id || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      website: data.website || undefined,
      paymentTerms: data.payment_terms || undefined,
      leadTimeDays: data.lead_time_days || 0,
      minimumOrderValue: data.minimum_order_value || 0,
      status: data.status,
      rating: data.rating || undefined,
      notes: data.notes || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // Conversão snake_case → camelCase para SupplierAddress
  private mapAddress(data: any): SupplierAddress {
    return {
      id: data.id,
      supplierId: data.supplier_id,
      type: data.type,
      street: data.street,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      isDefault: data.is_default,
      createdAt: new Date(data.created_at),
    };
  }

  // Conversão snake_case → camelCase para SupplierContact
  private mapContact(data: any): SupplierContact {
    return {
      id: data.id,
      supplierId: data.supplier_id,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      isPrimary: data.is_primary,
      notes: data.notes,
      createdAt: new Date(data.created_at),
    };
  }

  // Conversão snake_case → camelCase para ProductSupplier
  private mapProductSupplier(data: any): ProductSupplier {
    return {
      id: data.id,
      productId: data.product_id,
      supplierId: data.supplier_id,
      supplierSku: data.supplier_sku,
      unitPrice: data.unit_price,
      minimumQuantity: data.minimum_quantity,
      leadTimeDays: data.lead_time_days,
      isPreferred: data.is_preferred,
      lastPurchasePrice: data.last_purchase_price,
      lastPurchaseDate: data.last_purchase_date ? new Date(data.last_purchase_date) : undefined,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async findMany(params: { page: number; limit: number; search?: string; status?: string }) {
    const { page, limit, search, status } = params;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,tax_id.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(`Erro ao buscar fornecedores: ${error.message}`);

    return {
      data: (data || []).map(this.mapSupplier),
      total: count || 0,
    };
  }

  async findById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`);
    }

    return this.mapSupplier(data);
  }

  async findByCode(code: string): Promise<Supplier | null> {
    // Query using document field which maps to code in the application layer
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('document', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`);
    }

    return this.mapSupplier(data);
  }

  // Generate next sequential code for supplier
  private async generateSupplierCode(): Promise<string> {
    // Get the last supplier ordered by document field
    const { data, error } = await supabase
      .from('suppliers')
      .select('document')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last supplier code:', error);
      // If error, start from 1
      return 'FORN-0001';
    }

    if (!data || data.length === 0) {
      // First supplier
      return 'FORN-0001';
    }

    // Extract number from last code (e.g., "FORN-0005" -> 5)
    const lastCode = data[0].document;
    const match = lastCode.match(/FORN-(\d+)/);

    if (match) {
      const lastNumber = parseInt(match[1], 10);
      const nextNumber = lastNumber + 1;
      return `FORN-${String(nextNumber).padStart(4, '0')}`;
    }

    // If no match, start from 1
    return 'FORN-0001';
  }

  async create(supplierData: CreateSupplierDTO): Promise<Supplier> {
    const id = randomUUID();

    // Auto-generate code if not provided
    const code = await this.generateSupplierCode();

    const { data, error} = await supabase
      .from('suppliers')
      .insert({
        id,
        document: code, // Use auto-generated code
        name: supplierData.name,
        legal_name: supplierData.legalName,
        tax_id: supplierData.taxId,
        email: supplierData.email,
        phone: supplierData.phone,
        website: supplierData.website,
        payment_terms: supplierData.paymentTerms,
        lead_time_days: supplierData.leadTimeDays || 0,
        minimum_order_value: supplierData.minimumOrderValue || 0,
        status: supplierData.status || 'ACTIVE',
        rating: supplierData.rating,
        notes: supplierData.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`);

    return this.mapSupplier(data);
  }

  async update(id: string, supplierData: UpdateSupplierDTO): Promise<Supplier> {
    const updateData: any = {};

    // Do not allow code to be updated - it's auto-generated
    // if (supplierData.code !== undefined) updateData.document = supplierData.code;
    if (supplierData.name !== undefined) updateData.name = supplierData.name;
    if (supplierData.legalName !== undefined) updateData.legal_name = supplierData.legalName;
    if (supplierData.taxId !== undefined) updateData.tax_id = supplierData.taxId;
    if (supplierData.email !== undefined) updateData.email = supplierData.email;
    if (supplierData.phone !== undefined) updateData.phone = supplierData.phone;
    if (supplierData.website !== undefined) updateData.website = supplierData.website;
    if (supplierData.paymentTerms !== undefined) updateData.payment_terms = supplierData.paymentTerms;
    if (supplierData.leadTimeDays !== undefined) updateData.lead_time_days = supplierData.leadTimeDays;
    if (supplierData.minimumOrderValue !== undefined) updateData.minimum_order_value = supplierData.minimumOrderValue;
    if (supplierData.status !== undefined) updateData.status = supplierData.status;
    if (supplierData.rating !== undefined) updateData.rating = supplierData.rating;
    if (supplierData.notes !== undefined) updateData.notes = supplierData.notes;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);

    return this.mapSupplier(data);
  }

  async delete(id: string) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) throw new Error(`Erro ao deletar fornecedor: ${error.message}`);

    return { success: true };
  }

  // Métodos para endereços
  async getAddresses(supplierId: string): Promise<SupplierAddress[]> {
    const { data, error } = await supabase
      .from('supplier_addresses')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar endereços: ${error.message}`);

    return (data || []).map(this.mapAddress);
  }

  async addAddress(addressData: any): Promise<SupplierAddress> {
    const { data, error } = await supabase
      .from('supplier_addresses')
      .insert({
        supplier_id: addressData.supplierId,
        type: addressData.type,
        street: addressData.street,
        number: addressData.number,
        complement: addressData.complement,
        neighborhood: addressData.neighborhood,
        city: addressData.city,
        state: addressData.state,
        postal_code: addressData.postalCode,
        country: addressData.country || 'BR',
        is_default: addressData.isDefault || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar endereço: ${error.message}`);

    return this.mapAddress(data);
  }

  async updateAddress(id: string, addressData: any): Promise<SupplierAddress> {
    const updateData: any = {};

    if (addressData.type !== undefined) updateData.type = addressData.type;
    if (addressData.street !== undefined) updateData.street = addressData.street;
    if (addressData.number !== undefined) updateData.number = addressData.number;
    if (addressData.complement !== undefined) updateData.complement = addressData.complement;
    if (addressData.neighborhood !== undefined) updateData.neighborhood = addressData.neighborhood;
    if (addressData.city !== undefined) updateData.city = addressData.city;
    if (addressData.state !== undefined) updateData.state = addressData.state;
    if (addressData.postalCode !== undefined) updateData.postal_code = addressData.postalCode;
    if (addressData.country !== undefined) updateData.country = addressData.country;
    if (addressData.isDefault !== undefined) updateData.is_default = addressData.isDefault;

    const { data, error } = await supabase
      .from('supplier_addresses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar endereço: ${error.message}`);

    return this.mapAddress(data);
  }

  async deleteAddress(id: string) {
    const { error } = await supabase.from('supplier_addresses').delete().eq('id', id);

    if (error) throw new Error(`Erro ao deletar endereço: ${error.message}`);

    return { success: true };
  }

  // Métodos para contatos
  async getContacts(supplierId: string): Promise<SupplierContact[]> {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar contatos: ${error.message}`);

    return (data || []).map(this.mapContact);
  }

  async addContact(contactData: any): Promise<SupplierContact> {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .insert({
        supplier_id: contactData.supplierId,
        name: contactData.name,
        role: contactData.role,
        email: contactData.email,
        phone: contactData.phone,
        mobile: contactData.mobile,
        is_primary: contactData.isPrimary || false,
        notes: contactData.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar contato: ${error.message}`);

    return this.mapContact(data);
  }

  async updateContact(id: string, contactData: any): Promise<SupplierContact> {
    const updateData: any = {};

    if (contactData.name !== undefined) updateData.name = contactData.name;
    if (contactData.role !== undefined) updateData.role = contactData.role;
    if (contactData.email !== undefined) updateData.email = contactData.email;
    if (contactData.phone !== undefined) updateData.phone = contactData.phone;
    if (contactData.mobile !== undefined) updateData.mobile = contactData.mobile;
    if (contactData.isPrimary !== undefined) updateData.is_primary = contactData.isPrimary;
    if (contactData.notes !== undefined) updateData.notes = contactData.notes;

    const { data, error } = await supabase
      .from('supplier_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar contato: ${error.message}`);

    return this.mapContact(data);
  }

  async deleteContact(id: string) {
    const { error } = await supabase.from('supplier_contacts').delete().eq('id', id);

    if (error) throw new Error(`Erro ao deletar contato: ${error.message}`);

    return { success: true };
  }

  // Método para buscar produtos do fornecedor
  async getProductSuppliers(supplierId: string): Promise<ProductSupplier[]> {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_preferred', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar produtos do fornecedor: ${error.message}`);

    return (data || []).map(this.mapProductSupplier);
  }
}
