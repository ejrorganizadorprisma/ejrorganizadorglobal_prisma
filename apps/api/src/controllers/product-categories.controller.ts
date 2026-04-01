import { Request, Response } from 'express';
import { ProductCategoriesService } from '../services/product-categories.service';
import { CreateProductCategorySchema, UpdateProductCategorySchema } from '@ejr/shared-types';
import { logger } from '../config/logger';

export class ProductCategoriesController {
  private service: ProductCategoriesService;

  constructor() {
    this.service = new ProductCategoriesService();
  }

  async getAll(req: Request, res: Response) {
    try {
      logger.info('GET /api/v1/product-categories');
      const categories = await this.service.getAll();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      logger.error('Erro ao buscar categorias:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async getActive(req: Request, res: Response) {
    try {
      logger.info('GET /api/v1/product-categories/active');
      const categories = await this.service.getActive();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      logger.error('Erro ao buscar categorias ativas:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`GET /api/v1/product-categories/${id}`);

      const category = await this.service.getById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Categoria não encontrada' },
        });
      }

      res.json({ success: true, data: category });
    } catch (error: any) {
      logger.error('Erro ao buscar categoria:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      logger.info('POST /api/v1/product-categories');

      const validation = CreateProductCategorySchema.safeParse(req.body);
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

      const category = await this.service.create(validation.data);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      logger.error('Erro ao criar categoria:', error);

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
      logger.info(`PUT /api/v1/product-categories/${id}`);

      const validation = UpdateProductCategorySchema.safeParse(req.body);
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

      const category = await this.service.update(id, validation.data);
      res.json({ success: true, data: category });
    } catch (error: any) {
      logger.error('Erro ao atualizar categoria:', error);

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
      logger.info(`DELETE /api/v1/product-categories/${id}`);

      await this.service.delete(id);
      res.json({ success: true, message: 'Categoria excluída com sucesso' });
    } catch (error: any) {
      logger.error('Erro ao deletar categoria:', error);

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
