import { db } from '../config/database';
import type { Quote, QuoteStatus, QuoteItem, CreateQuoteDTO, UpdateQuoteDTO } from '@ejr/shared-types';

export class QuotesRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: QuoteStatus;
    customerId?: string;
    responsibleUserId?: string;
  }) {
    const { page, limit, search, status, customerId, responsibleUserId } = params;

    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (search) {
      conditions.push(`q.quote_number ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`q.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (customerId) {
      conditions.push(`q.customer_id = $${paramIndex}`);
      queryParams.push(customerId);
      paramIndex++;
    }

    if (responsibleUserId) {
      conditions.push(`q.responsible_user_id = $${paramIndex}`);
      queryParams.push(responsibleUserId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quotes q
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Main query
    const query = `
      SELECT
        q.*,
        c.id as customer_id,
        c.name as customer_name,
        c.document as customer_document
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    // Fetch items for each quote
    const quotes = await Promise.all(
      result.rows.map(async (row) => {
        const itemsResult = await db.query(
          `
          SELECT
            qi.*,
            p.id as product_id,
            p.name as product_name,
            p.code as product_code,
            p.factory_code as product_factory_code
          FROM quote_items qi
          LEFT JOIN products p ON qi.product_id = p.id
          WHERE qi.quote_id = $1
          `,
          [row.id]
        );

        return {
          ...row,
          customer: {
            id: row.customer_id,
            name: row.customer_name,
            document: row.customer_document,
          },
          items: itemsResult.rows.map((item) => ({
            ...item,
            product: item.product_id ? {
              id: item.product_id,
              name: item.product_name,
              code: item.product_code,
              factory_code: item.product_factory_code,
            } : null,
          })),
        };
      })
    );

    return { data: quotes, total };
  }

  async findById(id: string) {
    const query = `
      SELECT
        q.*,
        row_to_json(c.*) as customer
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const quote = result.rows[0];

    // Fetch items with products
    const itemsResult = await db.query(
      `
      SELECT
        qi.*,
        row_to_json(p.*) as product
      FROM quote_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = $1
      `,
      [id]
    );

    return this.mapToQuote({
      ...quote,
      items: itemsResult.rows,
    });
  }

  async create(quoteData: CreateQuoteDTO, userId: string) {
    const quoteNumber = await this.generateQuoteNumber();

    // Generate a unique ID for the quote
    const id = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Calcular totais primeiro
    const items = quoteData.items.map((item) => ({
      id: `qitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      quote_id: id,
      item_type: item.itemType,
      product_id: 'productId' in item ? item.productId : null,
      service_name: 'serviceName' in item ? item.serviceName : null,
      service_description: 'serviceDescription' in item ? item.serviceDescription : null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (quoteData.discount || 0);

    const insertQuoteQuery = `
      INSERT INTO quotes (
        id, quote_number, customer_id, subtotal, discount, total,
        status, valid_until, notes, responsible_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const quoteResult = await db.query(insertQuoteQuery, [
      id,
      quoteNumber,
      quoteData.customerId,
      subtotal,
      quoteData.discount || 0,
      total,
      'DRAFT',
      quoteData.validUntil,
      quoteData.notes,
      userId,
    ]);

    // Inserir items
    for (const item of items) {
      const insertItemQuery = `
        INSERT INTO quote_items (
          id, quote_id, item_type, product_id, service_name,
          service_description, quantity, unit_price, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await db.query(insertItemQuery, [
        item.id,
        item.quote_id,
        item.item_type,
        item.product_id,
        item.service_name,
        item.service_description,
        item.quantity,
        item.unit_price,
        item.total,
      ]);
    }

    // Buscar orçamento completo
    const quote = await this.findById(id);
    if (!quote) {
      throw new Error('Erro ao buscar orçamento criado');
    }

    return quote;
  }

  async update(id: string, quoteData: UpdateQuoteDTO) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (quoteData.customerId !== undefined) {
      updates.push(`customer_id = $${paramIndex}`);
      values.push(quoteData.customerId);
      paramIndex++;
    }
    if (quoteData.discount !== undefined) {
      updates.push(`discount = $${paramIndex}`);
      values.push(quoteData.discount);
      paramIndex++;
    }
    if (quoteData.validUntil !== undefined) {
      updates.push(`valid_until = $${paramIndex}`);
      values.push(quoteData.validUntil);
      paramIndex++;
    }
    if (quoteData.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(quoteData.notes);
      paramIndex++;
    }
    if (quoteData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(quoteData.status);
      paramIndex++;
    }

    // Se houver items, deletar os antigos e inserir novos
    if (quoteData.items) {
      // Deletar items antigos
      await db.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);

      // Inserir novos items
      const items = quoteData.items.map((item) => ({
        id: `qitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        quote_id: id,
        item_type: item.itemType,
        product_id: 'productId' in item ? item.productId : null,
        service_name: 'serviceName' in item ? item.serviceName : null,
        service_description: 'serviceDescription' in item ? item.serviceDescription : null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      for (const item of items) {
        const insertItemQuery = `
          INSERT INTO quote_items (
            id, quote_id, item_type, product_id, service_name,
            service_description, quantity, unit_price, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        await db.query(insertItemQuery, [
          item.id,
          item.quote_id,
          item.item_type,
          item.product_id,
          item.service_name,
          item.service_description,
          item.quantity,
          item.unit_price,
          item.total,
        ]);
      }

      // Recalcular totais
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const total = subtotal - (quoteData.discount || 0);
      updates.push(`subtotal = $${paramIndex}`);
      values.push(subtotal);
      paramIndex++;
      updates.push(`total = $${paramIndex}`);
      values.push(total);
      paramIndex++;
    }

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE quotes
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `;
      values.push(id);

      await db.query(updateQuery, values);
    }

    // Buscar orçamento completo
    const quote = await this.findById(id);
    if (!quote) {
      throw new Error('Orçamento não encontrado após atualização');
    }

    return quote;
  }

  async delete(id: string) {
    await db.query('DELETE FROM quotes WHERE id = $1', [id]);
    return { success: true };
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QOT-${year}-`;

    const query = `
      SELECT quote_number
      FROM quotes
      WHERE quote_number LIKE $1
      ORDER BY quote_number DESC
      LIMIT 1
    `;

    const result = await db.query(query, [`${prefix}%`]);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = parseInt(result.rows[0].quote_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private mapToQuote(data: any): Quote {
    return {
      id: data.id,
      quoteNumber: data.quote_number,
      customerId: data.customer_id,
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        quoteId: item.quote_id,
        itemType: item.item_type || 'PRODUCT',
        productId: item.product_id || undefined,
        serviceName: item.service_name || undefined,
        serviceDescription: item.service_description || undefined,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
        product: item.product
          ? { name: item.product.name, code: item.product.code || '', factoryCode: item.product.factory_code || undefined }
          : item.product_name
          ? { name: item.product_name, code: item.product_code || '', factoryCode: item.product_factory_code || undefined }
          : undefined,
      })),
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      status: data.status,
      validUntil: new Date(data.valid_until),
      notes: data.notes,
      responsibleUserId: data.responsible_user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
