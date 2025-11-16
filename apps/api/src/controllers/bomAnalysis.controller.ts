import type { Request, Response } from 'express';
import { BOMAnalysisService } from '../services/bomAnalysis.service';

export class BOMAnalysisController {
  private service: BOMAnalysisService;

  constructor() {
    this.service = new BOMAnalysisService();
  }

  explodeBOM = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity as string);

    if (!quantity || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantidade é obrigatória e deve ser um número válido',
        },
      });
    }

    const result = await this.service.explodeBOM(productId, quantity);

    res.json({
      success: true,
      data: result,
    });
  };

  checkAvailability = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity as string);

    if (!quantity || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantidade é obrigatória e deve ser um número válido',
        },
      });
    }

    const result = await this.service.checkAvailability(productId, quantity);

    res.json({
      success: true,
      data: result,
    });
  };

  suggestPurchases = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity as string);

    if (!quantity || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantidade é obrigatória e deve ser um número válido',
        },
      });
    }

    const result = await this.service.suggestPurchases(productId, quantity);

    res.json({
      success: true,
      data: result,
    });
  };
}
