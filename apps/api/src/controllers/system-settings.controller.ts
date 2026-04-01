import { Request, Response } from 'express';
import { SystemSettingsService } from '../services/system-settings.service';
import { logger } from '../config/logger';

const systemSettingsService = new SystemSettingsService();

export class SystemSettingsController {
  /**
   * GET /api/v1/system-settings
   * Buscar configurações do sistema
   */
  async getSettings(req: Request, res: Response) {
    try {
      const settings = await systemSettingsService.getSettings();
      res.json({ data: settings });
    } catch (error: any) {
      logger.error('Error fetching system settings:', error);
      res.status(500).json({
        error: {
          message: 'Erro ao buscar configurações do sistema',
          details: error.message,
        },
      });
    }
  }

  /**
   * PATCH /api/v1/system-settings
   * Atualizar configurações do sistema
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const dto = req.body;
      const settings = await systemSettingsService.updateSettings(dto);
      res.json({ data: settings });
    } catch (error: any) {
      logger.error('Error updating system settings:', error);

      if (error.message.includes('Taxa de câmbio') || error.message.includes('moeda')) {
        return res.status(400).json({
          error: {
            message: error.message,
          },
        });
      }

      res.status(500).json({
        error: {
          message: 'Erro ao atualizar configurações do sistema',
          details: error.message,
        },
      });
    }
  }
}
