import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../services/sales.service';
import type { AuthRequest } from '../middleware/auth';

export class SalesController {
  private service = new SalesService();

  convertQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { quoteId } = req.body;
      const userId = req.user!.id;

      const sale = await this.service.convertQuoteToSale(quoteId, userId);

      res.json({
        success: true,
        data: sale,
        message: 'Orçamento convertido em venda com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };
}
