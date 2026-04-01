import { Request, Response } from 'express';
import { ProductFamiliesService } from '../services/product-families.service';
import { CreateProductFamilySchema, UpdateProductFamilySchema } from '@ejr/shared-types';
import { logger } from '../config/logger';

export class ProductFamiliesController {
  private service: ProductFamiliesService;

  constructor() {
    this.service = new ProductFamiliesService();
  }

  async getAll(req: Request, res: Response) {
    try {
      logger.info('GET /api/v1/product-families');
      const families = await this.service.getAll();
      res.json({ success: true, data: families });
    } catch (error: any) {
      logger.error('Erro ao buscar famílias:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async getActive(req: Request, res: Response) {
    try {
      logger.info('GET /api/v1/product-families/active');
      const families = await this.service.getActive();
      res.json({ success: true, data: families });
    } catch (error: any) {
      logger.error('Erro ao buscar famílias ativas:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`GET /api/v1/product-families/${id}`);

      const family = await this.service.getById(id);
      if (!family) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Família não encontrada' },
        });
      }

      res.json({ success: true, data: family });
    } catch (error: any) {
      logger.error('Erro ao buscar família:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      logger.info('POST /api/v1/product-families');

      const validation = CreateProductFamilySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: validation.error.errors,
          },
        });
      }

      const family = await this.service.create(validation.data);
      res.status(201).json({ success: true, data: family });
    } catch (error: any) {
      logger.error('Erro ao criar família:', error);

      if (error.message.includes('Já existe')) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_ERROR', message: error.message },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`PUT /api/v1/product-families/${id}`);

      const validation = UpdateProductFamilySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: validation.error.errors,
          },
        });
      }

      const family = await this.service.update(id, validation.data);
      res.json({ success: true, data: family });
    } catch (error: any) {
      logger.error('Erro ao atualizar família:', error);

      if (error.message.includes('não encontrada')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message },
        });
      }

      if (error.message.includes('Já existe')) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_ERROR', message: error.message },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`DELETE /api/v1/product-families/${id}`);

      await this.service.delete(id);
      res.json({ success: true, message: 'Família excluída com sucesso' });
    } catch (error: any) {
      logger.error('Erro ao deletar família:', error);

      if (error.message.includes('não encontrada')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message },
        });
      }

      if (error.message.includes('Não é possível excluir')) {
        return res.status(400).json({
          success: false,
          error: { code: 'IN_USE_ERROR', message: error.message },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }
}
