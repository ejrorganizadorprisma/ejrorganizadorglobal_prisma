import type { Request, Response } from 'express';
import { ProductPartsService } from '../services/product-parts.service';

export class ProductPartsController {
  private service: ProductPartsService;

  constructor() {
    this.service = new ProductPartsService();
  }

  findByProductId = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const parts = await this.service.findByProductId(productId);

    res.json({
      success: true,
      data: parts,
    });
  };

  addPart = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { partId, quantity, isOptional } = req.body;

    if (!partId) {
      return res.status(400).json({
        success: false,
        message: 'ID da peça é obrigatório',
      });
    }

    if (!quantity || typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantidade é obrigatória e deve ser um número',
      });
    }

    const part = await this.service.addPart(productId, {
      partId,
      quantity,
      isOptional,
    });

    res.status(201).json({
      success: true,
      data: part,
      message: 'Peça adicionada com sucesso',
    });
  };

  updatePart = async (req: Request, res: Response) => {
    const { productPartId } = req.params;
    const { quantity, isOptional } = req.body;

    const part = await this.service.updatePart(productPartId, {
      quantity,
      isOptional,
    });

    res.json({
      success: true,
      data: part,
      message: 'Peça atualizada com sucesso',
    });
  };

  removePart = async (req: Request, res: Response) => {
    const { productPartId } = req.params;
    await this.service.removePart(productPartId);

    res.json({
      success: true,
      message: 'Peça removida com sucesso',
    });
  };

  getBOM = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const bom = await this.service.getBOM(productId);

    res.json({
      success: true,
      data: bom,
    });
  };

  checkAvailability = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity as string) || 1;

    const availability = await this.service.checkAvailability(productId, quantity);

    res.json({
      success: true,
      data: availability,
    });
  };
}
