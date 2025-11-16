import type { Request, Response } from 'express';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@ejr/shared-types';

export class CustomersController {
  private service: CustomersService;

  constructor() {
    this.service = new CustomersService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = req.query.search as string | undefined;
    const type = req.query.type as any;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      type,
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

  create = async (req: Request, res: Response) => {
    const data = CreateCustomerSchema.parse(req.body);
    const customer = await this.service.create(data);

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
