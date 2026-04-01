import type { Request, Response } from 'express';
import { ServicesService } from '../services/services.service';
import { CreateServiceSchema, UpdateServiceSchema } from '@ejr/shared-types';

export class ServicesController {
  private service: ServicesService;

  constructor() {
    this.service = new ServicesService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      category,
      isActive,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const service = await this.service.findById(id);

    res.json({
      success: true,
      data: service,
    });
  };

  findByCode = async (req: Request, res: Response) => {
    const { code } = req.params;
    const service = await this.service.findByCode(code);

    res.json({
      success: true,
      data: service,
    });
  };

  create = async (req: Request, res: Response) => {
    const data = CreateServiceSchema.parse(req.body);
    const service = await this.service.create(data);

    res.status(201).json({
      success: true,
      data: service,
      message: 'Serviço criado com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = UpdateServiceSchema.parse(req.body);
    const service = await this.service.update(id, data);

    res.json({
      success: true,
      data: service,
      message: 'Serviço atualizado com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Serviço excluído com sucesso',
    });
  };
}
