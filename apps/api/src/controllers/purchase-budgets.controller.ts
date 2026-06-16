import type { Request, Response } from 'express';
import { PurchaseBudgetsService } from '../services/purchase-budgets.service';
import { db } from '../config/database';

const service = new PurchaseBudgetsService();

// ==================== BUDGETS ====================

export const findMany = async (req: Request, res: Response) => {
  try {
    const { page, limit, status, priority, supplierId, createdBy, search } = req.query;
    const result = await service.findMany({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      status: status as any,
      priority: priority as any,
      supplierId: supplierId as string,
      createdBy: createdBy as string,
      search: search as string,
    });

    const p = page ? parseInt(page as string) : 1;
    const l = limit ? parseInt(limit as string) : 20;

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: p,
        limit: l,
        total: result.total,
        totalPages: Math.ceil(result.total / l),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const findById = async (req: Request, res: Response) => {
  try {
    const budget = await service.findById(req.params.id);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' } });

    const budget = await service.create({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.update(req.params.id, req.body, userId);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const history = await service.getHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await service.delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

// ==================== STATUS TRANSITIONS ====================

export const submit = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.submit(req.params.id, userId);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const budget = await service.approve(req.params.id, userId, userRole);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const reject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { reason } = req.body;
    const budget = await service.reject(req.params.id, userId, userRole, reason);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const reopen = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.reopen(req.params.id, userId);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const purchase = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.purchase(req.params.id, userId, req.body);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const registerInvoice = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.registerInvoice(req.params.id, userId, req.body);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const convertToOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const budget = await service.convertToOrder(req.params.id, userId);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const budget = await service.cancel(req.params.id, userId, userRole);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

// ==================== INSTALLMENTS ====================

export const payInstallment = async (req: Request, res: Response) => {
  try {
    const { id, installmentId } = req.params;
    const { paidDate } = req.body;
    const budget = await service.payInstallment(id, installmentId, paidDate || new Date().toISOString().split('T')[0]);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

// ==================== ITEMS ====================

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await service.getItems(req.params.id);
    res.json({ success: true, data: items });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const addItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const item = await service.addItem(req.params.id, req.body, userId);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const duplicateItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const item = await service.duplicateItem(req.params.itemId, userId);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await service.updateItem(req.params.itemId, req.body, userId);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await service.deleteItem(req.params.itemId, userId);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const selectQuote = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await service.selectQuote(req.params.itemId, req.params.quoteId, userId);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

// ==================== QUOTES ====================

export const getQuotes = async (req: Request, res: Response) => {
  try {
    const quotes = await service.getQuotes(req.params.itemId);
    res.json({ success: true, data: quotes });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const addQuote = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const quote = await service.addQuote(req.params.itemId, req.body, userId);
    res.status(201).json({ success: true, data: quote });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const updateQuote = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await service.updateQuote(req.params.quoteId, req.body, userId);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    await service.deleteQuote(req.params.quoteId, userId);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
};

// ==================== LAST PRICE ====================

export const getLastPrice = async (req: Request, res: Response) => {
  try {
    const { productId, supplierId } = req.query;
    if (!productId || !supplierId) {
      return res.status(400).json({ success: false, error: { message: 'productId e supplierId são obrigatórios.' } });
    }

    // Busca de 2 fontes: cotações anteriores e cadastro produto×fornecedor
    const query = `
      WITH quote_price AS (
        SELECT
          pbq.unit_price,
          pbq.created_at AS price_date,
          'quote' AS source
        FROM purchase_budget_quotes pbq
        JOIN purchase_budget_items pbi ON pbi.id = pbq.item_id
        WHERE pbi.product_id = $1
          AND pbq.supplier_id = $2
        ORDER BY pbq.created_at DESC
        LIMIT 1
      ),
      supplier_price AS (
        SELECT
          COALESCE(ps.last_purchase_price, ps.unit_price) AS unit_price,
          COALESCE(ps.last_purchase_date, ps.updated_at) AS price_date,
          CASE WHEN ps.last_purchase_price IS NOT NULL THEN 'purchase' ELSE 'catalog' END AS source
        FROM product_suppliers ps
        WHERE ps.product_id = $1
          AND ps.supplier_id = $2
        LIMIT 1
      ),
      all_prices AS (
        SELECT * FROM quote_price
        UNION ALL
        SELECT * FROM supplier_price
      )
      SELECT unit_price, price_date, source
      FROM all_prices
      ORDER BY price_date DESC
      LIMIT 1
    `;

    const result = await db.query(query, [productId, supplierId]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        unitPrice: parseFloat(row.unit_price) || 0,
        date: row.price_date,
        source: row.source, // 'quote' | 'purchase' | 'catalog'
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ==================== ÚLTIMA COMPRA (painel detalhado) ====================

// GET /api/v1/purchase-budgets/last-purchase?productId=X
// Retorna a última e a penúltima compra do produto (em qualquer fornecedor),
// com todos os dados para o painel: valor unitário, total, data, fornecedor,
// indústria, quantidade, prazo, nº do orçamento, nº da NF e moeda.
// Inclui também o preço de custo atual do produto para cálculo de variação.
export const getLastPurchase = async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'productId é obrigatório.' } });
    }

    // "Compra" = item com cotação selecionada num orçamento que avançou para
    // ORDERED/PURCHASED/RECEIVED (eventos reais de compra). Ordena pela data de
    // compra mais recente. Limita a 2 (última + penúltima).
    const query = `
      SELECT
        pb.id              AS budget_id,
        pb.budget_number   AS budget_number,
        pb.invoice_number  AS invoice_number,
        pb.currency        AS currency,
        pb.status          AS budget_status,
        COALESCE(pb.purchased_at, pb.updated_at) AS purchase_date,
        pbi.quantity       AS quantity,
        q.unit_price       AS unit_price,
        q.lead_time_days   AS lead_time_days,
        q.payment_terms    AS payment_terms,
        q.supplier_id      AS supplier_id,
        s.name             AS supplier_name,
        p.manufacturer     AS manufacturer,
        p.cost_price       AS current_cost_price,
        p.cost_price_currency AS current_cost_currency
      FROM purchase_budget_items pbi
      JOIN purchase_budgets pb ON pb.id = pbi.budget_id
      JOIN purchase_budget_quotes q ON q.id = pbi.selected_quote_id
      LEFT JOIN suppliers s ON s.id = q.supplier_id
      LEFT JOIN products p ON p.id = pbi.product_id
      WHERE pbi.product_id = $1
        AND pbi.selected_quote_id IS NOT NULL
        AND pb.status IN ('ORDERED', 'PURCHASED', 'RECEIVED')
      ORDER BY purchase_date DESC
      LIMIT 2
    `;

    const result = await db.query(query, [productId]);

    const mapRow = (row: any) => {
      const unitPrice = parseInt(row.unit_price, 10) || 0;
      const quantity = parseInt(row.quantity, 10) || 0;
      return {
        budgetId: row.budget_id,
        budgetNumber: row.budget_number,
        invoiceNumber: row.invoice_number || null,
        currency: row.currency || 'BRL',
        status: row.budget_status,
        date: row.purchase_date,
        quantity,
        unitPrice,                       // centavos BRL
        totalValue: unitPrice * quantity, // centavos BRL
        leadTimeDays: row.lead_time_days ?? null,
        paymentTerms: row.payment_terms || null,
        supplierId: row.supplier_id || null,
        supplierName: row.supplier_name || null,
        manufacturer: row.manufacturer || null,
      };
    };

    const rows = result.rows;
    const currentCost = rows[0]
      ? { value: parseInt(rows[0].current_cost_price, 10) || 0, currency: rows[0].current_cost_currency || 'BRL' }
      : null;

    res.json({
      success: true,
      data: {
        last: rows[0] ? mapRow(rows[0]) : null,
        previous: rows[1] ? mapRow(rows[1]) : null,
        currentCost, // preço de custo atual cadastrado (para variação %)
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
