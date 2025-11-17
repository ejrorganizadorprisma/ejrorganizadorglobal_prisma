import type { Request, Response } from 'express';
import { ProductsService } from '../services/products.service';
import { CreateProductSchema, UpdateProductSchema } from '@ejr/shared-types';

export class ProductsController {
  private service: ProductsService;

  constructor() {
    this.service = new ProductsService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status as any;
    const inStock = req.query.inStock === 'true';

    const result = await this.service.findMany({
      page,
      limit,
      search,
      category,
      status,
      inStock: req.query.inStock ? inStock : undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await this.service.findById(id);

    res.json({
      success: true,
      data: product,
    });
  };

  findByCode = async (req: Request, res: Response) => {
    const { code } = req.params;
    const product = await this.service.findByCode(code);

    res.json({
      success: true,
      data: product,
    });
  };

  create = async (req: Request, res: Response) => {
    const data = CreateProductSchema.parse(req.body);
    const product = await this.service.create(data);

    res.status(201).json({
      success: true,
      data: product,
      message: 'Produto criado com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = UpdateProductSchema.passthrough().parse(req.body);
    const product = await this.service.update(id, data);

    res.json({
      success: true,
      data: product,
      message: 'Produto atualizado com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Produto excluído com sucesso',
    });
  };

  getCategories = async (_req: Request, res: Response) => {
    const categories = await this.service.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  };

  getLowStock = async (_req: Request, res: Response) => {
    const products = await this.service.getLowStock();

    res.json({
      success: true,
      data: products,
    });
  };

  updateStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade inválida',
      });
    }

    if (!operation || !['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operação inválida. Use "add" ou "subtract"',
      });
    }

    const product = await this.service.updateStock(id, quantity, operation);

    res.json({
      success: true,
      data: product,
      message: 'Estoque atualizado com sucesso',
    });
  };

  // Novos endpoints para tipos de produtos
  getComponents = async (_req: Request, res: Response) => {
    const components = await this.service.getComponents();

    res.json({
      success: true,
      data: components,
    });
  };

  getFinalProducts = async (_req: Request, res: Response) => {
    const finalProducts = await this.service.getFinalProducts();

    res.json({
      success: true,
      data: finalProducts,
    });
  };

  uploadImage = async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada',
      });
    }

    const imageUrl = await this.service.uploadImage(req.file);

    res.json({
      success: true,
      data: {
        url: imageUrl,
      },
      message: 'Imagem enviada com sucesso',
    });
  };
}
