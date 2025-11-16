import type { Request, Response } from 'express';
import { ServiceOrdersService } from '../services/service-orders.service';

export class ServiceOrdersController {
  private service: ServiceOrdersService;

  constructor() {
    this.service = new ServiceOrdersService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const status = req.query.status as any;
    const customerId = req.query.customerId as string | undefined;
    const technicianId = req.query.technicianId as string | undefined;
    const isWarranty = req.query.isWarranty === 'true' ? true : req.query.isWarranty === 'false' ? false : undefined;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      status,
      customerId,
      technicianId,
      isWarranty,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceOrder = await this.service.findById(id);

    res.json({
      success: true,
      data: serviceOrder,
    });
  };

  create = async (req: Request, res: Response) => {
    const { customerId, productId, technicianId, isWarranty, issueDescription, customerNotes, estimatedDelivery } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Cliente é obrigatório',
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Produto é obrigatório',
      });
    }

    if (!issueDescription) {
      return res.status(400).json({
        success: false,
        message: 'Descrição do problema é obrigatória',
      });
    }

    const serviceOrder = await this.service.create({
      customerId,
      productId,
      technicianId,
      isWarranty: isWarranty ?? false,
      issueDescription,
      customerNotes,
      estimatedDelivery,
    });

    res.status(201).json({
      success: true,
      data: serviceOrder,
      message: 'Ordem de serviço criada com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      technicianId,
      status,
      diagnosis,
      servicePerformed,
      internalNotes,
      laborCost,
      estimatedDelivery,
      completionDate,
      photos,
      documents,
    } = req.body;

    const serviceOrder = await this.service.update(id, {
      technicianId,
      status,
      diagnosis,
      servicePerformed,
      internalNotes,
      laborCost,
      estimatedDelivery,
      completionDate,
      photos,
      documents,
    });

    res.json({
      success: true,
      data: serviceOrder,
      message: 'Ordem de serviço atualizada com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Ordem de serviço excluída com sucesso',
    });
  };

  getByStatus = async (req: Request, res: Response) => {
    const { status } = req.params;
    const serviceOrders = await this.service.getByStatus(status as any);

    res.json({
      success: true,
      data: serviceOrders,
    });
  };

  getByCustomer = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const serviceOrders = await this.service.getByCustomer(customerId);

    res.json({
      success: true,
      data: serviceOrders,
    });
  };

  addPart = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID do produto/peça é obrigatório',
      });
    }

    if (!quantity || typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantidade é obrigatória e deve ser um número',
      });
    }

    const result = await this.service.addPart(id, {
      productId,
      quantity,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Peça adicionada com sucesso',
    });
  };

  removePart = async (req: Request, res: Response) => {
    const { id, partId } = req.params;
    await this.service.removePart(id, partId);

    res.json({
      success: true,
      message: 'Peça removida com sucesso',
    });
  };

  complete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { servicePerformed, laborCost } = req.body;

    if (!servicePerformed) {
      return res.status(400).json({
        success: false,
        message: 'Descrição do serviço realizado é obrigatória',
      });
    }

    if (laborCost === undefined || typeof laborCost !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Custo de mão de obra é obrigatório e deve ser um número',
      });
    }

    const result = await this.service.complete(id, servicePerformed, laborCost);

    res.json({
      success: true,
      data: result,
      message: 'Ordem de serviço completada com sucesso',
    });
  };
}
