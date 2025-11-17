import type { Request, Response } from 'express';
import { ProductSuppliersService } from '../services/product-suppliers.service';
import { CreateProductSupplierSchema, UpdateProductSupplierSchema } from '@ejr/shared-types';

export class ProductSuppliersController {
  private service: ProductSuppliersService;

  constructor() {
    this.service = new ProductSuppliersService();
  }

  findByProductId = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const suppliers = await this.service.findByProductId(productId);

    res.json({
      success: true,
      data: suppliers,
    });
  };

  findBySupplierId = async (req: Request, res: Response) => {
    const { supplierId } = req.params;
    const products = await this.service.findBySupplierId(supplierId);

    res.json({
      success: true,
      data: products,
    });
  };

  create = async (req: Request, res: Response) => {
    const { productId } = req.params;

    const validation = CreateProductSupplierSchema.safeParse(req.body);
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

    const supplier = await this.service.create(productId, validation.data);

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Fornecedor vinculado com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;

    const validation = UpdateProductSupplierSchema.safeParse(req.body);
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

    const supplier = await this.service.update(id, validation.data);

    res.json({
      success: true,
      data: supplier,
      message: 'Relacionamento atualizado com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Fornecedor desvinculado com sucesso',
    });
  };
}
