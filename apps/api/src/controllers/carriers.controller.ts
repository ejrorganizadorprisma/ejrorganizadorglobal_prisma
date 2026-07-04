import { Request, Response } from 'express';
import { CarriersService } from '../services/carriers.service';
import { CreateCarrierSchema, UpdateCarrierSchema } from '@ejr/shared-types';

export class CarriersController {
  private service = new CarriersService();

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const result = await this.service.findMany({ page, limit, search, status });
    res.json({ success: true, data: result });
  };

  findById = async (req: Request, res: Response) => {
    const carrier = await this.service.findById(req.params.id);
    res.json({ success: true, data: carrier });
  };

  create = async (req: Request, res: Response) => {
    const data = CreateCarrierSchema.parse(req.body);
    const carrier = await this.service.create(data);
    res.status(201).json({ success: true, data: carrier });
  };

  update = async (req: Request, res: Response) => {
    const data = UpdateCarrierSchema.parse(req.body);
    const carrier = await this.service.update(req.params.id, data);
    res.json({ success: true, data: carrier });
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    res.json({ success: true, message: 'Transportadora removida com sucesso' });
  };
}
