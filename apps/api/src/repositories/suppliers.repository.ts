import { db } from '../config/database';
import { randomUUID } from 'node:crypto';

// Interface Supplier com todos os campos da tabela
export interface Supplier {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  taxId?: string;
  ci?: string;
  ruc?: string;
  manufacturer?: string; // Fabricante associado
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
  ci?: string;
  ruc?: string;
  manufacturer?: string;
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
  ci?: string;
  ruc?: string;
  manufacturer?: string;
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
      code: data.code, // Use the code column from database
      name: data.name,
      legalName: data.legal_name || undefined,
      taxId: data.tax_id || undefined,
      ci: data.ci || undefined,
      ruc: data.ruc || undefined,
      manufacturer: data.manufacturer || undefined,
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

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR document ILIKE $${paramIndex} OR tax_id ILIKE $${paramIndex} OR ci ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get count
    const countSql = `SELECT COUNT(*) as count FROM suppliers ${whereClause}`;
    const countResult = await db.query(countSql, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const dataSql = `
      SELECT * FROM suppliers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await db.query(dataSql, queryParams);

    return {
      data: dataResult.rows.map(this.mapSupplier),
      total,
    };
  }

  async findById(id: string): Promise<Supplier | null> {
    const sql = 'SELECT * FROM suppliers WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSupplier(result.rows[0]);
  }

  async findByCode(code: string): Promise<Supplier | null> {
    // Query using code field
    const sql = 'SELECT * FROM suppliers WHERE code = $1';
    const result = await db.query(sql, [code]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSupplier(result.rows[0]);
  }

  // Generate next sequential code for supplier
  private async generateSupplierCode(): Promise<string> {
    // Get the last supplier ordered by code field
    const sql = 'SELECT code FROM suppliers ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(sql);

    if (result.rows.length === 0) {
      // First supplier
      return 'FORN-0001';
    }

    // Extract number from last code (e.g., "FORN-0005" -> 5)
    const lastCode = result.rows[0].code;
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

    // Use taxId for document field, or code as fallback if taxId is not provided
    const document = supplierData.taxId || code;

    const sql = `
      INSERT INTO suppliers (
        id, code, document, name, legal_name, tax_id, ci, ruc, manufacturer, email, phone, website,
        payment_terms, lead_time_days, minimum_order_value, status, rating, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const result = await db.query(sql, [
      id,
      code, // Auto-generated code (FORN-XXXX)
      document, // taxId or code as fallback
      supplierData.name,
      supplierData.legalName,
      supplierData.taxId,
      supplierData.ci,
      supplierData.ruc,
      supplierData.manufacturer,
      supplierData.email,
      supplierData.phone,
      supplierData.website,
      supplierData.paymentTerms,
      supplierData.leadTimeDays || 0,
      supplierData.minimumOrderValue || 0,
      supplierData.status || 'ACTIVE',
      supplierData.rating,
      supplierData.notes,
    ]);

    return this.mapSupplier(result.rows[0]);
  }

  async update(id: string, supplierData: UpdateSupplierDTO): Promise<Supplier> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Do not allow code to be updated - it's auto-generated
    if (supplierData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(supplierData.name);
      paramIndex++;
    }
    if (supplierData.legalName !== undefined) {
      updateFields.push(`legal_name = $${paramIndex}`);
      queryParams.push(supplierData.legalName);
      paramIndex++;
    }
    if (supplierData.taxId !== undefined) {
      updateFields.push(`tax_id = $${paramIndex}`);
      queryParams.push(supplierData.taxId);
      paramIndex++;
    }
    if (supplierData.ci !== undefined) {
      updateFields.push(`ci = $${paramIndex}`);
      queryParams.push(supplierData.ci);
      paramIndex++;
    }
    if (supplierData.ruc !== undefined) {
      updateFields.push(`ruc = $${paramIndex}`);
      queryParams.push(supplierData.ruc);
      paramIndex++;
    }
    if (supplierData.manufacturer !== undefined) {
      updateFields.push(`manufacturer = $${paramIndex}`);
      queryParams.push(supplierData.manufacturer);
      paramIndex++;
    }
    if (supplierData.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      queryParams.push(supplierData.email);
      paramIndex++;
    }
    if (supplierData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(supplierData.phone);
      paramIndex++;
    }
    if (supplierData.website !== undefined) {
      updateFields.push(`website = $${paramIndex}`);
      queryParams.push(supplierData.website);
      paramIndex++;
    }
    if (supplierData.paymentTerms !== undefined) {
      updateFields.push(`payment_terms = $${paramIndex}`);
      queryParams.push(supplierData.paymentTerms);
      paramIndex++;
    }
    if (supplierData.leadTimeDays !== undefined) {
      updateFields.push(`lead_time_days = $${paramIndex}`);
      queryParams.push(supplierData.leadTimeDays);
      paramIndex++;
    }
    if (supplierData.minimumOrderValue !== undefined) {
      updateFields.push(`minimum_order_value = $${paramIndex}`);
      queryParams.push(supplierData.minimumOrderValue);
      paramIndex++;
    }
    if (supplierData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      queryParams.push(supplierData.status);
      paramIndex++;
    }
    if (supplierData.rating !== undefined) {
      updateFields.push(`rating = $${paramIndex}`);
      queryParams.push(supplierData.rating);
      paramIndex++;
    }
    if (supplierData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      queryParams.push(supplierData.notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    // Add id to params
    queryParams.push(id);

    const sql = `
      UPDATE suppliers
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(sql, queryParams);

    if (result.rows.length === 0) {
      throw new Error('Fornecedor não encontrado');
    }

    return this.mapSupplier(result.rows[0]);
  }

  async delete(id: string) {
    const sql = 'DELETE FROM suppliers WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Fornecedor não encontrado');
    }

    return { success: true };
  }

  // Métodos para endereços
  async getAddresses(supplierId: string): Promise<SupplierAddress[]> {
    const sql = `
      SELECT * FROM supplier_addresses
      WHERE supplier_id = $1
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await db.query(sql, [supplierId]);

    return result.rows.map(this.mapAddress);
  }

  async addAddress(addressData: any): Promise<SupplierAddress> {
    const sql = `
      INSERT INTO supplier_addresses (
        supplier_id, type, street, number, complement, neighborhood,
        city, state, postal_code, country, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(sql, [
      addressData.supplierId,
      addressData.type,
      addressData.street,
      addressData.number,
      addressData.complement,
      addressData.neighborhood,
      addressData.city,
      addressData.state,
      addressData.postalCode,
      addressData.country || 'BR',
      addressData.isDefault || false,
    ]);

    return this.mapAddress(result.rows[0]);
  }

  async updateAddress(id: string, addressData: any): Promise<SupplierAddress> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (addressData.type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      queryParams.push(addressData.type);
      paramIndex++;
    }
    if (addressData.street !== undefined) {
      updateFields.push(`street = $${paramIndex}`);
      queryParams.push(addressData.street);
      paramIndex++;
    }
    if (addressData.number !== undefined) {
      updateFields.push(`number = $${paramIndex}`);
      queryParams.push(addressData.number);
      paramIndex++;
    }
    if (addressData.complement !== undefined) {
      updateFields.push(`complement = $${paramIndex}`);
      queryParams.push(addressData.complement);
      paramIndex++;
    }
    if (addressData.neighborhood !== undefined) {
      updateFields.push(`neighborhood = $${paramIndex}`);
      queryParams.push(addressData.neighborhood);
      paramIndex++;
    }
    if (addressData.city !== undefined) {
      updateFields.push(`city = $${paramIndex}`);
      queryParams.push(addressData.city);
      paramIndex++;
    }
    if (addressData.state !== undefined) {
      updateFields.push(`state = $${paramIndex}`);
      queryParams.push(addressData.state);
      paramIndex++;
    }
    if (addressData.postalCode !== undefined) {
      updateFields.push(`postal_code = $${paramIndex}`);
      queryParams.push(addressData.postalCode);
      paramIndex++;
    }
    if (addressData.country !== undefined) {
      updateFields.push(`country = $${paramIndex}`);
      queryParams.push(addressData.country);
      paramIndex++;
    }
    if (addressData.isDefault !== undefined) {
      updateFields.push(`is_default = $${paramIndex}`);
      queryParams.push(addressData.isDefault);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    // Add id to params
    queryParams.push(id);

    const sql = `
      UPDATE supplier_addresses
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(sql, queryParams);

    if (result.rows.length === 0) {
      throw new Error('Endereço não encontrado');
    }

    return this.mapAddress(result.rows[0]);
  }

  async deleteAddress(id: string) {
    const sql = 'DELETE FROM supplier_addresses WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Endereço não encontrado');
    }

    return { success: true };
  }

  // Métodos para contatos
  async getContacts(supplierId: string): Promise<SupplierContact[]> {
    const sql = `
      SELECT * FROM supplier_contacts
      WHERE supplier_id = $1
      ORDER BY is_primary DESC, created_at DESC
    `;
    const result = await db.query(sql, [supplierId]);

    return result.rows.map(this.mapContact);
  }

  async addContact(contactData: any): Promise<SupplierContact> {
    const sql = `
      INSERT INTO supplier_contacts (
        supplier_id, name, role, email, phone, mobile, is_primary, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(sql, [
      contactData.supplierId,
      contactData.name,
      contactData.role,
      contactData.email,
      contactData.phone,
      contactData.mobile,
      contactData.isPrimary || false,
      contactData.notes,
    ]);

    return this.mapContact(result.rows[0]);
  }

  async updateContact(id: string, contactData: any): Promise<SupplierContact> {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (contactData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(contactData.name);
      paramIndex++;
    }
    if (contactData.role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      queryParams.push(contactData.role);
      paramIndex++;
    }
    if (contactData.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      queryParams.push(contactData.email);
      paramIndex++;
    }
    if (contactData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(contactData.phone);
      paramIndex++;
    }
    if (contactData.mobile !== undefined) {
      updateFields.push(`mobile = $${paramIndex}`);
      queryParams.push(contactData.mobile);
      paramIndex++;
    }
    if (contactData.isPrimary !== undefined) {
      updateFields.push(`is_primary = $${paramIndex}`);
      queryParams.push(contactData.isPrimary);
      paramIndex++;
    }
    if (contactData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      queryParams.push(contactData.notes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    // Add id to params
    queryParams.push(id);

    const sql = `
      UPDATE supplier_contacts
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(sql, queryParams);

    if (result.rows.length === 0) {
      throw new Error('Contato não encontrado');
    }

    return this.mapContact(result.rows[0]);
  }

  async deleteContact(id: string) {
    const sql = 'DELETE FROM supplier_contacts WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Contato não encontrado');
    }

    return { success: true };
  }

  // Método para buscar produtos do fornecedor
  async getProductSuppliers(supplierId: string): Promise<ProductSupplier[]> {
    const sql = `
      SELECT * FROM product_suppliers
      WHERE supplier_id = $1
      ORDER BY is_preferred DESC, created_at DESC
    `;
    const result = await db.query(sql, [supplierId]);

    return result.rows.map(this.mapProductSupplier);
  }

  // Método para buscar fabricantes únicos
  async getUniqueManufacturers(search?: string): Promise<string[]> {
    let sql = `
      SELECT DISTINCT manufacturer
      FROM suppliers
      WHERE manufacturer IS NOT NULL
        AND manufacturer != ''
    `;
    const params: any[] = [];

    if (search && search.trim() !== '') {
      sql += ` AND manufacturer ILIKE $1`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY manufacturer ASC`;

    const result = await db.query(sql, params);
    return result.rows.map(row => row.manufacturer);
  }
}
