import type { Request, Response } from 'express';
import { UsersService } from '../services/users.service';
import { UpdateUserSchema, UserRole } from '@ejr/shared-types';

export class UsersController {
  private service: UsersService;

  constructor() {
    this.service = new UsersService();
  }

  findMany = async (req: Request, res: Response) => {
    const pageParam = req.query.page as string;
    const limitParam = req.query.limit as string;

    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam) || 10)) : 10;
    const search = req.query.search as string | undefined;
    const role = req.query.role as UserRole | undefined;
    const isActiveParam = req.query.isActive as string | undefined;

    let isActive: boolean | undefined;
    if (isActiveParam === 'true') isActive = true;
    if (isActiveParam === 'false') isActive = false;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      role,
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
    const user = await this.service.findById(id);

    res.json({
      success: true,
      data: user,
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = UpdateUserSchema.parse(req.body);
    const user = await this.service.update(id, data);

    res.json({
      success: true,
      data: user,
      message: 'Usuário atualizado com sucesso',
    });
  };

  toggleStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await this.service.toggleStatus(id);

    res.json({
      success: true,
      data: user,
      message: `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso',
    });
  };
}
