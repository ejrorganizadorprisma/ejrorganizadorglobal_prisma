import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@ejr/shared-types';

export class CustomersController {
  private service: CustomersService;

  constructor() {
    this.service = new CustomersService();
  }

  findMany = async (req: AuthRequest, res: Response) => {
    const pageParam = req.query.page as string;
    const limitParam = req.query.limit as string;

    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam) || 10)) : 10;
    const search = req.query.search as string | undefined;
    const type = req.query.type as any;

    // SALESPERSON can only see customers they created
    const createdBy = req.user?.role === 'SALESPERSON' ? req.user.id : undefined;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      type,
      createdBy,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await this.service.findById(id);

    res.json({
      success: true,
      data: customer,
    });
  };

  findByDocument = async (req: Request, res: Response) => {
    const { document } = req.params;
    const customer = await this.service.findByDocument(document);

    res.json({
      success: true,
      data: customer,
    });
  };

  create = async (req: AuthRequest, res: Response) => {
    const data = CreateCustomerSchema.parse(req.body);
    const userId = req.user?.id;
    const customer = await this.service.create(data, userId);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Cliente criado com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = UpdateCustomerSchema.parse(req.body);
    const customer = await this.service.update(id, data);

    res.json({
      success: true,
      data: customer,
      message: 'Cliente atualizado com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Cliente excluído com sucesso',
    });
  };
}
