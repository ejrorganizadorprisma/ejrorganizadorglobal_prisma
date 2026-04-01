import type { Request, Response } from 'express';
import { InventoryMovementsRepository } from '../repositories/inventory-movements.repository';

const repository = new InventoryMovementsRepository();

export class InventoryMovementsController {
  findByProduct = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const type = req.query.type as string | undefined;

    const movements = await repository.findByProduct(productId, limit, type);

    res.json({
      success: true,
      data: movements,
    });
  };
}
