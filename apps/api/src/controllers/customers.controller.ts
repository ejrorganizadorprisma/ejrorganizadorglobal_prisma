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
    const limit = limitParam ? Math.min(1000, Math.max(1, parseInt(limitParam) || 10)) : 10;
    const search = req.query.search as string | undefined;
    const type = req.query.type as any;
    const approvalStatusFilter = req.query.approvalStatus as string | undefined;

    const isSalesperson = req.user?.role === 'SALESPERSON';

    // Vendedor mobile: ve apenas clientes APPROVED dos quais e responsavel
    // Outros: ve todos. Filtro por approvalStatus opcional via query.
    const responsibleUserId = isSalesperson ? req.user!.id : undefined;
    const approvalStatus = isSalesperson ? 'APPROVED' : approvalStatusFilter;

    const result = await this.service.findMany({
      page,
      limit,
      search,
      type,
      responsibleUserId,
      approvalStatus,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const customer = await this.service.findById(id);

    // Vendedor so pode ver clientes que sao dele e aprovados
    if (req.user?.role === 'SALESPERSON') {
      if (customer.responsibleUserId !== req.user.id || customer.approvalStatus !== 'APPROVED') {
        return res.status(404).json({ success: false, error: { message: 'Cliente não encontrado' } });
      }
    }

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
    const userRole = req.user?.role;
    const customer = await this.service.create(data, userId, userRole);

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Cliente criado com sucesso',
    });
  };

  update = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = UpdateCustomerSchema.parse(req.body);

    // Vendedor mobile nao pode editar responsibleUserId nem aprovar
    if (req.user?.role === 'SALESPERSON') {
      delete (data as any).responsibleUserId;
    }

    const customer = await this.service.update(id, data);

    res.json({
      success: true,
      data: customer,
      message: 'Cliente atualizado com sucesso',
    });
  };

  approve = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { responsibleUserId } = req.body as { responsibleUserId?: string | null };
    const approvedBy = req.user!.id;

    if (!['OWNER', 'DIRECTOR', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, error: { message: 'Sem permissão para aprovar' } });
    }

    const customer = await this.service.approve(id, approvedBy, responsibleUserId ?? null);
    res.json({ success: true, data: customer, message: 'Cliente aprovado' });
  };

  reject = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const rejectedBy = req.user!.id;

    if (!['OWNER', 'DIRECTOR', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, error: { message: 'Sem permissão para rejeitar' } });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Motivo da rejeição é obrigatório' } });
    }

    const customer = await this.service.reject(id, rejectedBy, reason.trim());
    res.json({ success: true, data: customer, message: 'Cliente rejeitado' });
  };

  delete = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!['OWNER', 'DIRECTOR', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, error: { message: 'Sem permissão para excluir cliente' } });
    }
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Cliente excluído com sucesso',
    });
  };
}
