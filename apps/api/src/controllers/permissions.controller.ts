import type { Request, Response } from 'express';
import { PermissionsService } from '../services/permissions.service';
import { PermissionsConfigSchema } from '@ejr/shared-types';

const permissionsService = new PermissionsService();

export class PermissionsController {
  getPermissions = async (req: Request, res: Response) => {
    try {
      const permissions = await permissionsService.getPermissions();
      res.json({ data: permissions });
    } catch (error) {
      console.error('Error getting permissions:', error);
      res.status(500).json({ error: { message: 'Erro ao buscar permissões' } });
    }
  };

  updatePermissions = async (req: Request, res: Response) => {
    try {
      const validatedData = PermissionsConfigSchema.parse(req.body);
      const updatedPermissions = await permissionsService.updatePermissions(validatedData);
      res.json({ data: updatedPermissions, message: 'Permissões atualizadas com sucesso' });
    } catch (error) {
      console.error('Error updating permissions:', error);
      res.status(500).json({ error: { message: 'Erro ao atualizar permissões' } });
    }
  };
}
