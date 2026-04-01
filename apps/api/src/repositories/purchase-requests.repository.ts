import { db } from '../config/database';

export type PurchaseRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED'
  | 'CANCELLED';

export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description?: string;
  requestedBy: string;
  requestedByUser?: {
    name: string;
    email: string;
  };
  department?: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  justification?: string;
  requestedDate: string;
  reviewedBy?: string;
  reviewedByUser?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  convertedToPurchaseOrderId?: string;
  convertedAt?: string;
  items?: PurchaseRequestItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  productId: string;
  product?: {
    code: string;
    name: string;
  };
  quantity: number;
  unitPrice?: number;
  estimatedTotal?: number;
  notes?: string;
  createdAt: string;
}

export interface CreatePurchaseRequestDTO {
  title: string;
  description?: string;
  requestedBy: string;
  department?: string;
  priority?: PurchaseRequestPriority;
  justification?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  }>;
}

export interface UpdatePurchaseRequestDTO {
  title?: string;
  description?: string;
  department?: string;
  priority?: PurchaseRequestPriority;
  justification?: string;
}

export interface ReviewPurchaseRequestDTO {
  status: 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy: string;
}

export class PurchaseRequestsRepository {
  async findMany(params: {
    page: number;
    limit: number;
    status?: PurchaseRequestStatus;
    priority?: PurchaseRequestPriority;
    requestedBy?: string;
  }) {
    const { page, limit, status, priority, requestedBy } = params;

    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }

    if (requestedBy) {
      conditions.push(`requested_by = $${paramIndex}`);
      queryParams.push(requestedBy);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM purchase_requests ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const result = await db.query(
      `SELECT * FROM purchase_requests ${whereClause} ORDER BY requested_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    // Fetch users separately
    const requestsWithUsers = await Promise.all(
      result.rows.map(async (req) => {
        let requested_by_user = null;
        let reviewed_by_user = null;

        if (req.requested_by) {
          const userResult = await db.query(
            'SELECT name, email FROM users WHERE id = $1',
            [req.requested_by]
          );
          requested_by_user = userResult.rows[0] || null;
        }

        if (req.reviewed_by) {
          const reviewerResult = await db.query(
            'SELECT name, email FROM users WHERE id = $1',
            [req.reviewed_by]
          );
          reviewed_by_user = reviewerResult.rows[0] || null;
        }

        return { ...req, requested_by_user, reviewed_by_user };
      })
    );

    return {
      data: requestsWithUsers.map((req) => this.mapToPurchaseRequest(req)),
      total,
    };
  }

  async findById(id: string): Promise<PurchaseRequest | null> {
    const result = await db.query(
      'SELECT * FROM purchase_requests WHERE id = $1',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Fetch users separately
    let requested_by_user = null;
    let reviewed_by_user = null;

    if (data.requested_by) {
      const userResult = await db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [data.requested_by]
      );
      requested_by_user = userResult.rows[0] || null;
    }

    if (data.reviewed_by) {
      const reviewerResult = await db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [data.reviewed_by]
      );
      reviewed_by_user = reviewerResult.rows[0] || null;
    }

    return this.mapToPurchaseRequest({ ...data, requested_by_user, reviewed_by_user });
  }

  async create(dto: CreatePurchaseRequestDTO): Promise<PurchaseRequest> {
    // Generate request number using RPC function
    const numberResult = await db.query('SELECT generate_purchase_request_number() as request_number');
    const requestNumber = numberResult.rows[0]?.request_number || 'REQ-000001';

    // Generate ID
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const result = await db.query(
      `INSERT INTO purchase_requests (
        id, request_number, title, description, requested_by, department,
        priority, justification, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        requestNumber,
        dto.title,
        dto.description || null,
        dto.requestedBy,
        dto.department || null,
        dto.priority || 'NORMAL',
        dto.justification || null,
        'PENDING'
      ]
    );

    const data = result.rows[0];

    // Create items
    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const itemId = `req-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO purchase_request_items (
            id, purchase_request_id, product_id, quantity, unit_price,
            estimated_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            itemId,
            id,
            item.productId,
            item.quantity,
            item.unitPrice || null,
            item.unitPrice ? item.unitPrice * item.quantity : null,
            item.notes || null
          ]
        );
      }
    }

    // Fetch requested_by user
    let requested_by_user = null;
    if (data.requested_by) {
      const userResult = await db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [data.requested_by]
      );
      requested_by_user = userResult.rows[0] || null;
    }

    return this.mapToPurchaseRequest({ ...data, requested_by_user });
  }

  async update(id: string, dto: UpdatePurchaseRequestDTO): Promise<PurchaseRequest> {
    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      setClauses.push(`title = $${paramIndex}`);
      queryParams.push(dto.title);
      paramIndex++;
    }
    if (dto.description !== undefined) {
      setClauses.push(`description = $${paramIndex}`);
      queryParams.push(dto.description);
      paramIndex++;
    }
    if (dto.department !== undefined) {
      setClauses.push(`department = $${paramIndex}`);
      queryParams.push(dto.department);
      paramIndex++;
    }
    if (dto.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex}`);
      queryParams.push(dto.priority);
      paramIndex++;
    }
    if (dto.justification !== undefined) {
      setClauses.push(`justification = $${paramIndex}`);
      queryParams.push(dto.justification);
      paramIndex++;
    }

    // Update only if there are fields to update
    if (setClauses.length > 0) {
      queryParams.push(id);
      await db.query(
        `UPDATE purchase_requests SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        queryParams
      );
    }

    // Update items if provided
    if (dto.items && dto.items.length > 0) {
      // Delete existing items
      await db.query(
        'DELETE FROM purchase_request_items WHERE purchase_request_id = $1',
        [id]
      );

      // Insert new items
      for (const item of dto.items) {
        const itemId = `req-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await db.query(
          `INSERT INTO purchase_request_items (
            id, purchase_request_id, product_id, quantity, unit_price,
            estimated_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            itemId,
            id,
            item.productId,
            item.quantity,
            item.unitPrice || null,
            item.unitPrice ? item.unitPrice * item.quantity : null,
            item.notes || null
          ]
        );
      }
    }

    return this.findById(id) as Promise<PurchaseRequest>;
  }

  async review(id: string, dto: ReviewPurchaseRequestDTO): Promise<PurchaseRequest> {
    await db.query(
      `UPDATE purchase_requests
       SET status = $1, reviewed_by = $2, reviewed_at = $3, review_notes = $4
       WHERE id = $5`,
      [dto.status, dto.reviewedBy, new Date().toISOString(), dto.reviewNotes || null, id]
    );

    return this.findById(id) as Promise<PurchaseRequest>;
  }

  async markAsConverted(id: string, purchaseOrderId: string): Promise<PurchaseRequest> {
    await db.query(
      `UPDATE purchase_requests
       SET status = $1, converted_to_purchase_order_id = $2, converted_at = $3
       WHERE id = $4`,
      ['CONVERTED', purchaseOrderId, new Date().toISOString(), id]
    );

    return this.findById(id) as Promise<PurchaseRequest>;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await db.query(
      'DELETE FROM purchase_requests WHERE id = $1',
      [id]
    );

    return { success: true };
  }

  async getItems(requestId: string): Promise<PurchaseRequestItem[]> {
    const result = await db.query(
      'SELECT * FROM purchase_request_items WHERE purchase_request_id = $1 ORDER BY created_at ASC',
      [requestId]
    );

    // Fetch products separately
    const itemsWithProducts = await Promise.all(
      result.rows.map(async (item) => {
        let product = null;
        if (item.product_id) {
          const productResult = await db.query(
            'SELECT code, name FROM products WHERE id = $1',
            [item.product_id]
          );
          product = productResult.rows[0] || null;
        }
        return { ...item, product };
      })
    );

    return itemsWithProducts.map((item) => this.mapToItem(item));
  }

  private mapToPurchaseRequest(data: any): PurchaseRequest {
    return {
      id: data.id,
      requestNumber: data.request_number,
      title: data.title,
      description: data.description,
      requestedBy: data.requested_by,
      requestedByUser: data.requested_by_user ? {
        name: data.requested_by_user.name,
        email: data.requested_by_user.email,
      } : undefined,
      department: data.department,
      priority: data.priority,
      status: data.status,
      justification: data.justification,
      requestedDate: data.requested_date,
      reviewedBy: data.reviewed_by,
      reviewedByUser: data.reviewed_by_user ? {
        name: data.reviewed_by_user.name,
        email: data.reviewed_by_user.email,
      } : undefined,
      reviewedAt: data.reviewed_at,
      reviewNotes: data.review_notes,
      convertedToPurchaseOrderId: data.converted_to_purchase_order_id,
      convertedAt: data.converted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToItem(data: any): PurchaseRequestItem {
    return {
      id: data.id,
      purchaseRequestId: data.purchase_request_id,
      productId: data.product_id,
      product: data.product ? {
        code: data.product.code,
        name: data.product.name,
      } : undefined,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      estimatedTotal: data.estimated_total,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }
}
