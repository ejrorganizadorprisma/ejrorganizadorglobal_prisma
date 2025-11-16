import type { Request, Response } from 'express';
import { ProductionOrdersService } from '../services/production-orders.service';
import type {
  ProductionOrderStatus,
  ProductionOrderPriority,
} from '../repositories/production-orders.repository';

export class ProductionOrdersController {
  private service: ProductionOrdersService;

  constructor() {
    this.service = new ProductionOrdersService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ProductionOrderStatus | undefined;
    const priority = req.query.priority as ProductionOrderPriority | undefined;
    const productId = req.query.productId as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;

    const result = await this.service.findMany({
      page,
      limit,
      status,
      priority,
      productId,
      assignedTo,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.findById(id);

    res.json({
      success: true,
      data: order,
    });
  };

  create = async (req: Request, res: Response) => {
    const order = await this.service.create(req.body);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Ordem de produção criada com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.update(id, req.body);

    res.json({
      success: true,
      data: order,
      message: 'Ordem de produção atualizada com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Ordem de produção excluída com sucesso',
    });
  };

  getMaterialConsumption = async (req: Request, res: Response) => {
    const { id } = req.params;
    const materials = await this.service.getMaterialConsumption(id);

    res.json({
      success: true,
      data: materials,
    });
  };

  getOperations = async (req: Request, res: Response) => {
    const { id } = req.params;
    const operations = await this.service.getOperations(id);

    res.json({
      success: true,
      data: operations,
    });
  };

  getReportings = async (req: Request, res: Response) => {
    const { id } = req.params;
    const reportings = await this.service.getReportings(id);

    res.json({
      success: true,
      data: reportings,
    });
  };

  /**
   * POST /api/production-orders/:id/release
   * Libera ordem para produção
   */
  release = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.release(id);

    res.json({
      success: true,
      data: order,
      message: 'Ordem liberada para produção',
    });
  };

  /**
   * POST /api/production-orders/:id/report
   * Apontar produção
   */
  report = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantityProduced, quantityScrapped, scrapReason, reportedBy, shift, notes } = req.body;

    if (!quantityProduced || quantityProduced <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade produzida deve ser maior que zero',
      });
    }

    const reporting = await this.service.report(id, {
      productionOrderId: id,
      quantityProduced,
      quantityScrapped,
      scrapReason,
      reportedBy,
      shift,
      notes,
    });

    res.json({
      success: true,
      data: reporting,
      message: 'Produção apontada com sucesso',
    });
  };

  /**
   * POST /api/production-orders/:id/complete
   * Completar ordem de produção
   */
  complete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.complete(id);

    res.json({
      success: true,
      data: order,
      message: 'Ordem de produção completada com sucesso',
    });
  };

  /**
   * POST /api/production-orders/:id/pause
   * Pausar ordem de produção
   */
  pause = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.pause(id);

    res.json({
      success: true,
      data: order,
      message: 'Ordem de produção pausada',
    });
  };

  /**
   * POST /api/production-orders/:id/resume
   * Retomar ordem pausada
   */
  resume = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.resume(id);

    res.json({
      success: true,
      data: order,
      message: 'Ordem de produção retomada',
    });
  };

  /**
   * POST /api/production-orders/:id/cancel
   * Cancelar ordem de produção
   */
  cancel = async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.service.cancel(id);

    res.json({
      success: true,
      data: order,
      message: 'Ordem de produção cancelada',
    });
  };
}
