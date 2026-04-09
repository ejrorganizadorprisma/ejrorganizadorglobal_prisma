import { db } from '../config/database';
import type {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  CreateSalesOrderDTO,
  UpdateSalesOrderDTO,
  SalesOrderFilters,
} from '@ejr/shared-types';

/**
 * Repositório de Pedidos de Venda (sales_orders).
 *
 * Um Pedido é uma "pré-venda" criada pelo vendedor no campo. NÃO movimenta
 * estoque, NÃO gera parcelas (sale_payments) e NÃO gera comissão. Isso tudo
 * só acontece quando o Pedido é convertido em Venda no módulo sales.
 *
 * Sempre que o método abrir uma transação, seguir o padrão db.transaction()
 * (pool.connect) — pgbouncer em modo transaction-pool quebra db.query('BEGIN').
 */
export class SalesOrdersRepository {
  /**
   * Listar pedidos com filtros e paginação
   */
  async findAll(filters: SalesOrderFilters) {
    const {
      page = 1,
      limit = 20,
      customerId,
      sellerId,
      status,
      startDate,
      endDate,
      search,
    } = filters;

    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (search) {
      conditions.push(`so.order_number ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (customerId) {
      conditions.push(`so.customer_id = $${paramIndex}`);
      queryParams.push(customerId);
      paramIndex++;
    }

    if (sellerId) {
      conditions.push(`so.seller_id = $${paramIndex}`);
      queryParams.push(sellerId);
      paramIndex++;
    }

    if (status) {
      conditions.push(`so.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`so.order_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`so.order_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM sales_orders so ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    const query = `
      SELECT
        so.*,
        c.id    AS customer_id_join,
        c.name  AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        c.document AS customer_document,
        u.id    AS seller_id_join,
        u.name  AS seller_name,
        u.email AS seller_email,
        s.id    AS sale_id_join,
        s.sale_number AS sale_number
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users     u ON so.seller_id   = u.id
      LEFT JOIN sales     s ON so.sale_id     = s.id
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    const orders = await Promise.all(
      result.rows.map(async (row) => {
        const itemsResult = await db.query(
          `SELECT
             soi.*,
             p.id   AS p_id,
             p.code AS p_code,
             p.name AS p_name,
             p.current_stock AS p_current_stock
           FROM sales_order_items soi
           LEFT JOIN products p ON soi.product_id = p.id
           WHERE soi.sales_order_id = $1`,
          [row.id]
        );

        return this.mapToSalesOrder({
          ...row,
          customer: row.customer_id_join
            ? {
                id: row.customer_id_join,
                name: row.customer_name,
                email: row.customer_email,
                phone: row.customer_phone,
                document: row.customer_document,
              }
            : null,
          seller: row.seller_id_join
            ? {
                id: row.seller_id_join,
                name: row.seller_name,
                email: row.seller_email,
              }
            : null,
          sale: row.sale_id_join
            ? { id: row.sale_id_join, sale_number: row.sale_number }
            : null,
          items: itemsResult.rows.map((item) => ({
            ...item,
            product: item.p_id
              ? {
                  id: item.p_id,
                  code: item.p_code,
                  name: item.p_name,
                  current_stock: item.p_current_stock,
                }
              : null,
          })),
        });
      })
    );

    return { data: orders, total };
  }

  /**
   * Buscar pedido por ID
   */
  async findById(id: string): Promise<SalesOrder | null> {
    const query = `
      SELECT
        so.*,
        row_to_json(c.*) AS customer,
        row_to_json(u.*) AS seller,
        row_to_json(s.*) AS sale
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users     u ON so.seller_id   = u.id
      LEFT JOIN sales     s ON so.sale_id     = s.id
      WHERE so.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const itemsResult = await db.query(
      `SELECT
         soi.*,
         row_to_json(p.*) AS product
       FROM sales_order_items soi
       LEFT JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1`,
      [id]
    );

    return this.mapToSalesOrder({
      ...row,
      items: itemsResult.rows,
    });
  }

  /**
   * Criar novo pedido.
   *
   * Usa db.transaction() para inserir header + itens atomicamente.
   */
  async create(
    dto: CreateSalesOrderDTO,
    createdBy: string,
    sellerIdOverride?: string
  ): Promise<SalesOrder> {
    const createdId = await db.transaction(async (client) => {
      const orderNumber = await this.generateOrderNumber(client);

      // Resolver sellerId: prioridade → dto.sellerId → override (criador quando é SALESPERSON) → createdBy
      const sellerId = dto.sellerId || sellerIdOverride || createdBy;

      // Calcular totais
      let subtotal = 0;
      const items = dto.items.map((item) => {
        const itemDiscount = item.discount || 0;
        const itemTotal = item.quantity * item.unitPrice - itemDiscount;
        subtotal += itemTotal;
        return { ...item, discount: itemDiscount, total: itemTotal };
      });

      const discount = dto.discount || 0;
      const total = subtotal - discount;

      const id = `sorder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      await client.query(
        `INSERT INTO sales_orders (
          id, order_number, customer_id, quote_id, seller_id, status,
          order_date, subtotal, discount, total, notes, internal_notes,
          latitude, longitude, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          id,
          orderNumber,
          dto.customerId,
          dto.quoteId || null,
          sellerId,
          'PENDING',
          dto.orderDate,
          subtotal,
          discount,
          total,
          dto.notes || null,
          dto.internalNotes || null,
          dto.latitude ?? null,
          dto.longitude ?? null,
          createdBy,
        ]
      );

      for (const item of items) {
        const itemId = `soitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await client.query(
          `INSERT INTO sales_order_items (
            id, sales_order_id, item_type, product_id, service_name,
            quantity, unit_price, discount, total
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            itemId,
            id,
            item.itemType,
            item.productId || null,
            item.serviceName || null,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.total,
          ]
        );
      }

      // Se foi convertido de um orçamento, marcar orçamento como convertido
      if (dto.quoteId) {
        try {
          await client.query(
            `UPDATE quotes SET status = 'CONVERTED' WHERE id = $1`,
            [dto.quoteId]
          );
        } catch (err) {
          // não bloqueia a criação do pedido se o update do quote falhar
          console.error('Erro ao marcar orçamento como convertido:', err);
        }
      }

      return id;
    });

    const order = await this.findById(createdId);
    if (!order) throw new Error('Erro ao buscar pedido recém-criado');
    return order;
  }

  /**
   * Atualizar pedido.
   *
   * Suporta edição completa: campos do header (cliente, data, notas, status)
   * E substituição atômica dos itens (delete all + insert new) dentro de
   * db.transaction() — obrigatório com pgbouncer transaction-pool.
   */
  async update(id: string, dto: UpdateSalesOrderDTO): Promise<SalesOrder> {
    await db.transaction(async (client) => {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.customerId !== undefined) {
        updates.push(`customer_id = $${paramIndex++}`);
        values.push(dto.customerId);
      }
      if (dto.orderDate !== undefined) {
        updates.push(`order_date = $${paramIndex++}`);
        values.push(dto.orderDate);
      }
      if (dto.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(dto.status);
      }
      if (dto.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(dto.notes);
      }
      if (dto.internalNotes !== undefined) {
        updates.push(`internal_notes = $${paramIndex++}`);
        values.push(dto.internalNotes);
      }

      // Se items foram enviados: delete antigos + insert novos + recalcular totais
      if (dto.items && dto.items.length > 0) {
        await client.query(
          'DELETE FROM sales_order_items WHERE sales_order_id = $1',
          [id]
        );

        let subtotal = 0;
        for (const item of dto.items) {
          const itemDiscount = item.discount || 0;
          const itemTotal = item.quantity * item.unitPrice - itemDiscount;
          subtotal += itemTotal;

          const itemId = `soitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          await client.query(
            `INSERT INTO sales_order_items (
              id, sales_order_id, item_type, product_id, service_name,
              quantity, unit_price, discount, total
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              itemId, id, item.itemType,
              item.productId || null, item.serviceName || null,
              item.quantity, item.unitPrice, itemDiscount, itemTotal,
            ]
          );
        }

        updates.push(`subtotal = $${paramIndex++}`);
        values.push(subtotal);

        const discount = dto.discount !== undefined ? dto.discount : 0;
        updates.push(`discount = $${paramIndex++}`);
        values.push(discount);
        updates.push(`total = $${paramIndex++}`);
        values.push(subtotal - discount);
      } else if (dto.discount !== undefined) {
        // Sem novos itens mas mudou desconto: recalcular total
        const current = await client.query(
          'SELECT subtotal FROM sales_orders WHERE id = $1', [id]
        );
        const currentSubtotal = current.rows[0]?.subtotal || 0;
        updates.push(`discount = $${paramIndex++}`);
        values.push(dto.discount);
        updates.push(`total = $${paramIndex++}`);
        values.push(currentSubtotal - dto.discount);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(id);
        await client.query(
          `UPDATE sales_orders SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
    });

    // findById FORA da transação — dados já commitados
    const order = await this.findById(id);
    if (!order) throw new Error('Pedido não encontrado após atualização');
    return order;
  }

  /**
   * Marcar pedido como convertido em venda. Usada pelo salesOrdersService
   * logo após criar a Sale correspondente.
   */
  async markAsConverted(
    id: string,
    saleId: string,
    convertedBy: string,
    client?: any
  ): Promise<void> {
    const query = `
      UPDATE sales_orders
         SET status       = 'CONVERTED',
             sale_id      = $1,
             converted_at = NOW(),
             converted_by = $2,
             updated_at   = NOW()
       WHERE id = $3
    `;
    const params = [saleId, convertedBy, id];
    if (client) {
      await client.query(query, params);
    } else {
      await db.query(query, params);
    }
  }

  /**
   * Cancelar pedido (não pode estar convertido)
   */
  async cancel(id: string, cancelledBy: string, reason?: string): Promise<SalesOrder> {
    await db.query(
      `UPDATE sales_orders
          SET status = 'CANCELLED',
              cancelled_at = NOW(),
              cancelled_by = $1,
              cancel_reason = $2,
              updated_at = NOW()
        WHERE id = $3
          AND status NOT IN ('CONVERTED','CANCELLED')`,
      [cancelledBy, reason || null, id]
    );
    const order = await this.findById(id);
    if (!order) throw new Error('Pedido não encontrado');
    return order;
  }

  /**
   * Deletar pedido (apenas DRAFT/PENDING sem sale_id)
   */
  async delete(id: string): Promise<void> {
    await db.query(
      `DELETE FROM sales_orders WHERE id = $1 AND sale_id IS NULL`,
      [id]
    );
  }

  /**
   * Gera próximo número de pedido (PED-YYYY-NNNN).
   *
   * IMPORTANT: quando chamado dentro de db.transaction(), passar o `client`
   * para evitar deadlock em pgbouncer transaction-pool.
   */
  private async generateOrderNumber(client?: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PED-${year}-`;
    const query = `
      SELECT order_number
        FROM sales_orders
       WHERE order_number LIKE $1
       ORDER BY order_number DESC
       LIMIT 1
    `;
    const result = client
      ? await client.query(query, [`${prefix}%`])
      : await db.query(query, [`${prefix}%`]);

    let next = 1;
    if (result.rows.length > 0) {
      const last = parseInt(result.rows[0].order_number.split('-')[2]);
      next = last + 1;
    }
    return `${prefix}${next.toString().padStart(4, '0')}`;
  }

  private mapToSalesOrder(row: any): SalesOrder {
    return {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      quoteId: row.quote_id || undefined,
      sellerId: row.seller_id,
      status: row.status as SalesOrderStatus,
      orderDate: row.order_date,
      subtotal: row.subtotal,
      discount: row.discount,
      total: row.total,
      notes: row.notes || undefined,
      internalNotes: row.internal_notes || undefined,
      latitude: row.latitude != null ? Number(row.latitude) : undefined,
      longitude: row.longitude != null ? Number(row.longitude) : undefined,
      saleId: row.sale_id || undefined,
      convertedAt: row.converted_at || undefined,
      convertedBy: row.converted_by || undefined,
      cancelledAt: row.cancelled_at || undefined,
      cancelledBy: row.cancelled_by || undefined,
      cancelReason: row.cancel_reason || undefined,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: row.customer
        ? {
            id: row.customer.id,
            name: row.customer.name,
            email: row.customer.email || undefined,
            phone: row.customer.phone || undefined,
            document: row.customer.document || undefined,
          }
        : undefined,
      seller: row.seller
        ? {
            id: row.seller.id,
            name: row.seller.name,
            email: row.seller.email,
          }
        : undefined,
      items: row.items
        ? row.items.map((i: any) => this.mapToItem(i))
        : undefined,
      sale: row.sale
        ? {
            id: row.sale.id,
            saleNumber: row.sale.sale_number,
          }
        : undefined,
    };
  }

  private mapToItem(data: any): SalesOrderItem {
    return {
      id: data.id,
      salesOrderId: data.sales_order_id,
      itemType: data.item_type,
      productId: data.product_id || undefined,
      serviceName: data.service_name || undefined,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      discount: data.discount,
      total: data.total,
      product: data.product
        ? {
            id: data.product.id,
            code: data.product.code,
            name: data.product.name,
            currentStock: data.product.current_stock,
          }
        : undefined,
    };
  }
}
