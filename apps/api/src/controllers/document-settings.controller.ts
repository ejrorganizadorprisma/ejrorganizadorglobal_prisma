import { Request, Response } from 'express';
import { DocumentSettingsService } from '../services/document-settings.service';

export class DocumentSettingsController {
  private service: DocumentSettingsService;

  constructor() {
    this.service = new DocumentSettingsService();
  }

  getAllSettings = async (req: Request, res: Response) => {
    try {
      const settings = await this.service.getAllSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error fetching document settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Erro ao buscar configurações de documentos',
        },
      });
    }
  };

  getSettingsById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const settings = await this.service.getSettingsById(id);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error fetching document settings by ID:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Erro ao buscar configuração de documentos',
        },
      });
    }
  };

  getDefaultSettings = async (req: Request, res: Response) => {
    try {
      const settings = await this.service.getDefaultSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error fetching default document settings:', error);
      res.status(error.message.includes('Nenhuma configuração') ? 404 : 500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Erro ao buscar configuração padrão',
        },
      });
    }
  };

  createSettings = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const settings = await this.service.createSettings(req.body, userId);

      res.status(201).json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error creating document settings:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Erro ao criar configuração de documentos',
          details: error.errors,
        },
      });
    }
  };

  updateSettings = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const settings = await this.service.updateSettings(id, req.body);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      console.error('Error updating document settings:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 400).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Erro ao atualizar configuração de documentos',
          details: error.errors,
        },
      });
    }
  };

  deleteSettings = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteSettings(id);

      res.json({
        success: true,
        message: 'Configuração de documentos deletada com sucesso',
      });
    } catch (error: any) {
      console.error('Error deleting document settings:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 400).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Erro ao deletar configuração de documentos',
        },
      });
    }
  };

  setAsDefault = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const settings = await this.service.setAsDefault(id);

      res.json({
        success: true,
        data: settings,
        message: 'Configuração definida como padrão',
      });
    } catch (error: any) {
      console.error('Error setting default document settings:', error);
      res.status(error.message.includes('não encontrada') ? 404 : 400).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Erro ao definir configuração como padrão',
        },
      });
    }
  };
}
