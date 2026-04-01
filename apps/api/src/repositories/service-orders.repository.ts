import { db } from '../config/database';
import type { ServiceOrder, ServiceOrderWithRelations, ServiceOrderStatus, CreateServiceOrderDTO, UpdateServiceOrderDTO } from '@ejr/shared-types';

export class ServiceOrdersRepository {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: ServiceOrderStatus;
    customerId?: string;
    technicianId?: string;
    isWarranty?: boolean;
  }) {
    const { page, limit, search, status, customerId, technicianId, isWarranty } = params;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      conditions.push(`(order_number ILIKE $${paramIndex} OR issue_description ILIKE $${paramIndex} OR diagnosis ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de status
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Filtro de cliente
    if (customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      values.push(customerId);
      paramIndex++;
    }

    // Filtro de técnico
    if (technicianId) {
      conditions.push(`technician_id = $${paramIndex}`);
      values.push(technicianId);
      paramIndex++;
    }

    // Filtro de garantia
    if (isWarranty !== undefined) {
      conditions.push(`is_warranty = $${paramIndex}`);
      values.push(isWarranty);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM service_orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);

    if (!result.rows || result.rows.length === 0) {
      return [];
    }

    // Buscar relações separadamente
    const customerIds = [...new Set(result.rows.map(o => o.customer_id).filter(Boolean))];
    const productIds = [...new Set(result.rows.map(o => o.product_id).filter(Boolean))];
    const technicianIds = [...new Set(result.rows.map(o => o.technician_id).filter(Boolean))];

    const [customersData, productsData, techniciansData] = await Promise.all([
      customerIds.length > 0
        ? db.query('SELECT * FROM customers WHERE id = ANY($1)', [customerIds])
        : { rows: [] },
      productIds.length > 0
        ? db.query('SELECT * FROM products WHERE id = ANY($1)', [productIds])
        : { rows: [] },
      technicianIds.length > 0
        ? db.query('SELECT * FROM users WHERE id = ANY($1)', [technicianIds])
        : { rows: [] },
    ]);

    const customersMap = new Map((customersData.rows || []).map(c => [c.id, c]));
    const productsMap = new Map((productsData.rows || []).map(p => [p.id, p]));
    const techniciansMap = new Map((techniciansData.rows || []).map(u => [u.id, u]));

    // Converte snake_case para camelCase e adiciona relações
    return result.rows.map(order => {
      const customer = customersMap.get(order.customer_id);
      const product = productsMap.get(order.product_id);
      const technician = order.technician_id ? techniciansMap.get(order.technician_id) : null;

      const orderWithRelations = {
        ...order,
        customer: customer,
        product: product,
        technician: technician,
      };
      return this.mapToServiceOrder(orderWithRelations);
    });
  }

  async count(params: {
    search?: string;
    status?: ServiceOrderStatus;
    customerId?: string;
    technicianId?: string;
    isWarranty?: boolean;
  }) {
    const { search, status, customerId, technicianId, isWarranty } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filtro de busca
    if (search) {
      conditions.push(`(order_number ILIKE $${paramIndex} OR issue_description ILIKE $${paramIndex} OR diagnosis ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de status
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    // Filtro de cliente
    if (customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      values.push(customerId);
      paramIndex++;
    }

    // Filtro de técnico
    if (technicianId) {
      conditions.push(`technician_id = $${paramIndex}`);
      values.push(technicianId);
      paramIndex++;
    }

    // Filtro de garantia
    if (isWarranty !== undefined) {
      conditions.push(`is_warranty = $${paramIndex}`);
      values.push(isWarranty);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as count FROM service_orders ${whereClause}`;

    try {
      const result = await db.query(query, values);
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      console.error('Database count error:', error);
      return 0;
    }
  }

  async findById(id: string) {
    // Buscar ordem sem JOINs para evitar problemas com NULL foreign keys
    const result = await db.query('SELECT * FROM service_orders WHERE id = $1', [id]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Buscar relações separadamente
    const [customerData, productData, technicianData, partsData] = await Promise.all([
      data.customer_id
        ? db.query('SELECT id, name, document, email, phone FROM customers WHERE id = $1', [data.customer_id])
        : { rows: [] },
      data.product_id
        ? db.query('SELECT id, code, name, category FROM products WHERE id = $1', [data.product_id])
        : { rows: [] },
      data.technician_id
        ? db.query('SELECT id, name, email FROM users WHERE id = $1', [data.technician_id])
        : { rows: [] },
      db.query('SELECT id, service_order_id, product_id, quantity, unit_cost, total_cost, created_at FROM service_parts WHERE service_order_id = $1', [id]),
    ]);

    // Buscar produtos das peças usadas separadamente
    const partProductIds = (partsData.rows || []).map((p: any) => p.product_id).filter(Boolean);
    const partsProducts = partProductIds.length > 0
      ? await db.query('SELECT id, code, name FROM products WHERE id = ANY($1)', [partProductIds])
      : { rows: [] };

    const partsProductsMap = new Map((partsProducts.rows || []).map((p: any) => [p.id, p]));

    // Adicionar produtos às peças
    const partsUsed = (partsData.rows || []).map((part: any) => ({
      ...part,
      product: partsProductsMap.get(part.product_id) || null,
    }));

    // Combinar dados
    const orderWithRelations = {
      ...data,
      customer: customerData.rows[0] || null,
      product: productData.rows[0] || null,
      technician: technicianData.rows[0] || null,
      partsUsed,
    };

    // Converte snake_case para camelCase
    return {
      id: data.id,
      orderNumber: data.order_number,
      customerId: data.customer_id,
      productId: data.product_id,
      technicianId: data.technician_id,
      status: data.status,
      isWarranty: data.is_warranty,
      issueDescription: data.issue_description,
      diagnosis: data.diagnosis,
      servicePerformed: data.service_performed,
      customerNotes: data.customer_notes,
      internalNotes: data.internal_notes,
      laborCost: data.labor_cost,
      partsCost: data.parts_cost,
      totalCost: data.total_cost,
      entryDate: data.entry_date,
      estimatedDelivery: data.estimated_delivery,
      completionDate: data.completion_date,
      photos: data.photos,
      documents: data.documents,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      customer: orderWithRelations.customer ? {
        id: orderWithRelations.customer.id,
        name: orderWithRelations.customer.name,
        document: orderWithRelations.customer.document,
        email: orderWithRelations.customer.email,
        phone: orderWithRelations.customer.phone,
      } : undefined,
      product: orderWithRelations.product ? {
        id: orderWithRelations.product.id,
        code: orderWithRelations.product.code,
        name: orderWithRelations.product.name,
        category: orderWithRelations.product.category,
      } : undefined,
      technician: orderWithRelations.technician ? {
        id: orderWithRelations.technician.id,
        name: orderWithRelations.technician.name,
        email: orderWithRelations.technician.email,
      } : undefined,
      partsUsed: orderWithRelations.partsUsed.map((part: any) => ({
        id: part.id,
        serviceOrderId: part.service_order_id,
        productId: part.product_id,
        quantity: part.quantity,
        unitCost: part.unit_cost,
        totalCost: part.total_cost,
        createdAt: part.created_at,
        product: part.product ? {
          id: part.product.id,
          code: part.product.code,
          name: part.product.name,
        } : undefined,
      })),
    } as ServiceOrderWithRelations;
  }

  async create(orderData: CreateServiceOrderDTO) {
    // Gerar número da OS usando RPC
    const orderNumberResult = await db.query('SELECT generate_service_order_number() as order_number');
    const orderNumber = orderNumberResult.rows[0]?.order_number;

    if (!orderNumber) {
      throw new Error('Erro ao gerar número da OS');
    }

    // Generate a unique ID for the service order
    const id = `service-order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const columns = [
      'id', 'order_number', 'customer_id', 'product_id', 'status',
      'is_warranty', 'issue_description', 'customer_notes',
      'estimated_delivery', 'entry_date', 'labor_cost', 'parts_cost', 'total_cost'
    ];
    const values = [
      id,
      orderNumber,
      orderData.customerId,
      orderData.productId,
      'OPEN',
      orderData.isWarranty,
      orderData.issueDescription,
      orderData.customerNotes,
      orderData.estimatedDelivery,
      new Date().toISOString(),
      0,
      0,
      0
    ];

    // Only include technician_id if it has a valid value (not empty, not undefined)
    if (orderData.technicianId && orderData.technicianId.trim() !== '' && orderData.technicianId !== 'undefined') {
      columns.push('technician_id');
      values.push(orderData.technicianId);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO service_orders (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Erro ao criar ordem de serviço');
    }

    return this.mapToServiceOrder(result.rows[0]);
  }

  async update(id: string, orderData: UpdateServiceOrderDTO) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (orderData.technicianId !== undefined) {
      updateFields.push(`technician_id = $${paramIndex}`);
      values.push(orderData.technicianId);
      paramIndex++;
    }
    if (orderData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(orderData.status);
      paramIndex++;
    }
    if (orderData.diagnosis !== undefined) {
      updateFields.push(`diagnosis = $${paramIndex}`);
      values.push(orderData.diagnosis);
      paramIndex++;
    }
    if (orderData.servicePerformed !== undefined) {
      updateFields.push(`service_performed = $${paramIndex}`);
      values.push(orderData.servicePerformed);
      paramIndex++;
    }
    if (orderData.internalNotes !== undefined) {
      updateFields.push(`internal_notes = $${paramIndex}`);
      values.push(orderData.internalNotes);
      paramIndex++;
    }
    if (orderData.laborCost !== undefined) {
      updateFields.push(`labor_cost = $${paramIndex}`);
      values.push(orderData.laborCost);
      paramIndex++;
    }
    if (orderData.estimatedDelivery !== undefined) {
      updateFields.push(`estimated_delivery = $${paramIndex}`);
      values.push(orderData.estimatedDelivery);
      paramIndex++;
    }
    if (orderData.completionDate !== undefined) {
      updateFields.push(`completion_date = $${paramIndex}`);
      values.push(orderData.completionDate);
      paramIndex++;
    }
    if (orderData.photos !== undefined) {
      updateFields.push(`photos = $${paramIndex}`);
      values.push(orderData.photos);
      paramIndex++;
    }
    if (orderData.documents !== undefined) {
      updateFields.push(`documents = $${paramIndex}`);
      values.push(orderData.documents);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    values.push(id);
    const query = `
      UPDATE service_orders
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Erro ao atualizar ordem de serviço');
    }

    return this.mapToServiceOrder(result.rows[0]);
  }

  async delete(id: string) {
    const result = await db.query('DELETE FROM service_orders WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error('Ordem de serviço não encontrada');
    }

    return { success: true };
  }

  async getByStatus(status: ServiceOrderStatus) {
    const result = await db.query(
      'SELECT * FROM service_orders WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );

    return (result.rows || []).map(order => this.mapToServiceOrder(order));
  }

  async getByCustomer(customerId: string) {
    const result = await db.query(
      'SELECT * FROM service_orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );

    return (result.rows || []).map(order => this.mapToServiceOrder(order));
  }

  async completeServiceOrder(id: string, servicePerformed: string, laborCost: number) {
    const result = await db.query(
      'SELECT complete_service_order($1, $2, $3) as data',
      [id, servicePerformed, laborCost]
    );

    return { success: true, data: result.rows[0]?.data };
  }

  private mapToServiceOrder(data: any): ServiceOrderWithRelations {
    return {
      id: data.id,
      orderNumber: data.order_number,
      customerId: data.customer_id,
      productId: data.product_id,
      technicianId: data.technician_id,
      status: data.status,
      isWarranty: data.is_warranty,
      issueDescription: data.issue_description,
      diagnosis: data.diagnosis,
      servicePerformed: data.service_performed,
      customerNotes: data.customer_notes,
      internalNotes: data.internal_notes,
      laborCost: data.labor_cost || 0,
      partsCost: data.parts_cost || 0,
      totalCost: data.total_cost || 0,
      entryDate: data.entry_date,
      estimatedDelivery: data.estimated_delivery,
      completionDate: data.completion_date,
      photos: data.photos,
      documents: data.documents,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // Add relations - support both singular (from findMany) and nested (from findById with relations)
      customer: data.customer ? {
        id: data.customer.id,
        name: data.customer.name,
        document: data.customer.document || data.customer.cpf_cnpj,
        email: data.customer.email,
        phone: data.customer.phone,
      } : {
        id: '',
        name: 'Cliente não encontrado',
        document: '',
      },
      product: data.product ? {
        id: data.product.id,
        code: data.product.code,
        name: data.product.name,
        category: data.product.category,
      } : {
        id: '',
        code: '',
        name: 'Produto não encontrado',
        category: '',
      },
      technician: data.technician ? {
        id: data.technician.id,
        name: data.technician.name,
        email: data.technician.email,
      } : undefined,
      partsUsed: data.partsUsed || [],
    } as ServiceOrderWithRelations;
  }
}
