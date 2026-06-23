import { Request, Response } from 'express';
import { BrandsService } from '../services/brands.service';
import { AuthRequest } from '../middleware/auth';

export class BrandsController {
  private service: BrandsService;

  constructor() {
    this.service = new BrandsService();
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
    const brand = await this.service.findById(id);
    res.json({ success: true, data: brand });
  };

  create = async (req: AuthRequest, res: Response) => {
    const brand = await this.service.create(req.body);
    res.status(201).json({ success: true, data: brand });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await this.service.update(id, req.body);
    res.json({ success: true, data: brand });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);
    res.json({ success: true, message: 'Marca deletada com sucesso' });
  };
}
