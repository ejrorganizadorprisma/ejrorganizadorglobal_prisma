import { Request, Response } from 'express';
import { ManufacturersService } from '../services/manufacturers.service';
import { AuthRequest } from '../middleware/auth';

export class ManufacturersController {
  private service: ManufacturersService;

  constructor() {
    this.service = new ManufacturersService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const search = req.query.search as string;
    const status = req.query.status as string;

    const result = await this.service.findMany({ page, limit, search, status });
    res.json({ success: true, data: result });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const manufacturer = await this.service.findById(id);
    res.json({ success: true, data: manufacturer });
  };

  create = async (_req: AuthRequest, res: Response) => {
    const manufacturer = await this.service.create(_req.body);
    res.status(201).json({ success: true, data: manufacturer });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const manufacturer = await this.service.update(id, req.body);
    res.json({ success: true, data: manufacturer });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);
    res.json({ success: true, message: 'Indústria deletada com sucesso' });
  };
}
