import { Request, Response } from 'express';
import { SupplierOrdersService } from '../services/supplier-orders.service';
import { z } from 'zod';

// Schemas de validação
const UpdateSupplierOrderSchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED']).optional(),
  expectedDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  shippingCost: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

const GenerateOrdersSchema = z.object({
  purchaseOrderId: z.string().min(1, 'ID da ordem de compra é obrigatório'),
});

export class SupplierOrdersController {
  private service: SupplierOrdersService;

  constructor() {
    this.service = new SupplierOrdersService();
  }

  findMany = async (req: Request, res: Response) => {
    const {
      page = '1',
      limit = '20',
      search,
      status,
      supplierId,
      purchaseOrderId,
      groupCode,
      startDate,
      endDate,
    } = req.query;

    const result = await this.service.findMany({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      status: status as string,
      supplierId: supplierId as string,
      purchaseOrderId: purchaseOrderId as string,
      groupCode: groupCode as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
        hasMore: parseInt(page as string) * parseInt(limit as string) < result.total,
      },
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.findById(id);
    res.json({ success: true, data: order });
  };

  findByGroupCode = async (req: Request, res: Response) => {
    const { groupCode } = req.params;
    const orders = await this.service.findByGroupCode(groupCode);
    res.json({ success: true, data: orders });
  };

  findByPurchaseOrderId = async (req: Request, res: Response) => {
    const { purchaseOrderId } = req.params;
    const orders = await this.service.findByPurchaseOrderId(purchaseOrderId);
    res.json({ success: true, data: orders });
  };

  generateFromPurchaseOrder = async (req: Request, res: Response) => {
    const validation = GenerateOrdersSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: validation.error.errors,
        },
      });
    }

    const userId = (req as any).user?.id;
    const result = await this.service.generateFromPurchaseOrder(
      validation.data.purchaseOrderId,
      userId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `${result.totalOrders} pedido(s) gerado(s) com sucesso`,
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const validation = UpdateSupplierOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: validation.error.errors,
        },
      });
    }

    const order = await this.service.update(id, validation.data);
    res.json({ success: true, data: order, message: 'Pedido atualizado com sucesso' });
  };

  send = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.send(id);
    res.json({ success: true, data: order, message: 'Pedido enviado ao fornecedor' });
  };

  confirm = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.confirm(id);
    res.json({ success: true, data: order, message: 'Pedido confirmado pelo fornecedor' });
  };

  cancel = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.cancel(id);
    res.json({ success: true, data: order, message: 'Pedido cancelado' });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);
    res.json({ success: true, message: 'Pedido excluído com sucesso' });
  };

  getItems = async (req: Request, res: Response) => {
    const { id } = req.params;
    const items = await this.service.getItems(id);
    res.json({ success: true, data: items });
  };
}
