import { db } from '../config/database';
import type { Customer, CustomerType, CreateCustomerDTO, UpdateCustomerDTO } from '@ejr/shared-types';

export class CustomersRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    type?: CustomerType;
    createdBy?: string;
  }) {
    const { page, limit, search, type, createdBy } = params;

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR document ILIKE $${paramIndex} OR ci ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de tipo
    if (type) {
      whereClauses.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Filtro de criador (vendedor)
    if (createdBy) {
      whereClauses.push(`created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Add pagination parameters
    queryParams.push(limit);
    queryParams.push((page - 1) * limit);

    const sql = `
      SELECT * FROM customers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(sql, queryParams);

    // Converte snake_case para camelCase
    return result.rows.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document: customer.document,
      ci: customer.ci,
      ruc: customer.ruc,
      type: customer.type,
      address: customer.address,
      allowedPaymentMethods: customer.allowed_payment_methods,
      creditMaxDays: customer.credit_max_days,
      createdBy: customer.created_by,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    }));
  }

  async count(params: { search?: string; type?: CustomerType; createdBy?: string }) {
    const { search, type, createdBy } = params;

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR document ILIKE $${paramIndex} OR ci ILIKE $${paramIndex} OR ruc ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de tipo
    if (type) {
      whereClauses.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Filtro de criador (vendedor)
    if (createdBy) {
      whereClauses.push(`created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT COUNT(*) as count FROM customers
      ${whereClause}
    `;

    const result = await db.query(sql, queryParams);

    return parseInt(result.rows[0].count, 10);
  }

  async findById(id: string) {
    const sql = 'SELECT * FROM customers WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0) {
      return null; // Não encontrado
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      ci: data.ci,
      ruc: data.ruc,
      type: data.type,
      address: data.address,
      allowedPaymentMethods: data.allowed_payment_methods,
      creditMaxDays: data.credit_max_days,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findByDocument(document: string) {
    const sql = 'SELECT * FROM customers WHERE document = $1';
    const result = await db.query(sql, [document]);

    if (result.rows.length === 0) {
      return null; // Não encontrado
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      ci: data.ci,
      ruc: data.ruc,
      type: data.type,
      address: data.address,
      allowedPaymentMethods: data.allowed_payment_methods,
      creditMaxDays: data.credit_max_days,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async create(customerData: CreateCustomerDTO, userId?: string) {
    // Generate a unique ID for the customer
    const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const sql = `
      INSERT INTO customers (id, name, email, phone, document, ci, ruc, type, address, allowed_payment_methods, credit_max_days, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await db.query(sql, [
      id,
      customerData.name,
      customerData.email,
      customerData.phone,
      customerData.document || null,
      customerData.ci || null,
      customerData.ruc || null,
      customerData.type,
      customerData.address,
      customerData.allowedPaymentMethods || null,
      customerData.creditMaxDays || null,
      userId || null,
    ]);

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      ci: data.ci,
      ruc: data.ruc,
      type: data.type,
      address: data.address,
      allowedPaymentMethods: data.allowed_payment_methods,
      creditMaxDays: data.credit_max_days,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async update(id: string, customerData: UpdateCustomerDTO) {
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (customerData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(customerData.name);
      paramIndex++;
    }
    if (customerData.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      queryParams.push(customerData.email);
      paramIndex++;
    }
    if (customerData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(customerData.phone);
      paramIndex++;
    }
    if (customerData.document !== undefined) {
      updateFields.push(`document = $${paramIndex}`);
      queryParams.push(customerData.document || null);
      paramIndex++;
    }
    if (customerData.ci !== undefined) {
      updateFields.push(`ci = $${paramIndex}`);
      queryParams.push(customerData.ci || null);
      paramIndex++;
    }
    if (customerData.ruc !== undefined) {
      updateFields.push(`ruc = $${paramIndex}`);
      queryParams.push(customerData.ruc || null);
      paramIndex++;
    }
    if (customerData.type !== undefined) {
      updateFields.push(`type = $${paramIndex}`);
      queryParams.push(customerData.type);
      paramIndex++;
    }
    if (customerData.address !== undefined) {
      updateFields.push(`address = $${paramIndex}`);
      queryParams.push(customerData.address);
      paramIndex++;
    }
    if (customerData.allowedPaymentMethods !== undefined) {
      updateFields.push(`allowed_payment_methods = $${paramIndex}`);
      queryParams.push(customerData.allowedPaymentMethods);
      paramIndex++;
    }
    if (customerData.creditMaxDays !== undefined) {
      updateFields.push(`credit_max_days = $${paramIndex}`);
      queryParams.push(customerData.creditMaxDays);
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
      UPDATE customers
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(sql, queryParams);

    if (result.rows.length === 0) {
      throw new Error('Cliente não encontrado');
    }

    const data = result.rows[0];

    // Converte snake_case para camelCase
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      ci: data.ci,
      ruc: data.ruc,
      type: data.type,
      address: data.address,
      allowedPaymentMethods: data.allowed_payment_methods,
      creditMaxDays: data.credit_max_days,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string) {
    const sql = 'DELETE FROM customers WHERE id = $1';
    const result = await db.query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Cliente não encontrado');
    }

    return { success: true };
  }
}
