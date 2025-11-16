import type { Request, Response } from 'express';
import { StockReservationsService } from '../services/stock-reservations.service';
import { ReservationStatus, ReservationType } from '../repositories/stock-reservations.repository';

export class StockReservationsController {
  private service: StockReservationsService;

  constructor() {
    this.service = new StockReservationsService();
  }

  findMany = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const productId = req.query.productId as string | undefined;
    const status = req.query.status as ReservationStatus | undefined;
    const reservedForType = req.query.reservedForType as ReservationType | undefined;

    const result = await this.service.findMany({
      page,
      limit,
      productId,
      status,
      reservedForType,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  };

  findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const reservation = await this.service.findById(id);

    res.json({
      success: true,
      data: reservation,
    });
  };

  create = async (req: Request, res: Response) => {
    const {
      productId,
      quantity,
      reservedForType,
      reservedForId,
      reservedBy,
      reason,
      expiresAt,
      notes,
    } = req.body;

    // Validação básica
    if (!productId || !quantity || !reservedForType) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: productId, quantity, reservedForType',
      });
    }

    const reservation = await this.service.create({
      productId,
      quantity,
      reservedForType,
      reservedForId,
      reservedBy,
      reason,
      expiresAt,
      notes,
    });

    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reserva criada com sucesso',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity, status, expiresAt, notes } = req.body;

    const reservation = await this.service.update(id, {
      quantity,
      status,
      expiresAt,
      notes,
    });

    res.json({
      success: true,
      data: reservation,
      message: 'Reserva atualizada com sucesso',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.service.delete(id);

    res.json({
      success: true,
      message: 'Reserva excluída com sucesso',
    });
  };

  consumeReservation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const reservation = await this.service.consumeReservation(id);

    res.json({
      success: true,
      data: reservation,
      message: 'Reserva consumida com sucesso',
    });
  };

  cancelReservation = async (req: Request, res: Response) => {
    const { id } = req.params;
    const reservation = await this.service.cancelReservation(id);

    res.json({
      success: true,
      data: reservation,
      message: 'Reserva cancelada com sucesso',
    });
  };

  getByProduct = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const activeOnly = req.query.activeOnly !== 'false';

    const reservations = await this.service.getByProduct(productId, activeOnly);

    res.json({
      success: true,
      data: reservations,
    });
  };

  getTotalReserved = async (req: Request, res: Response) => {
    const { productId } = req.params;
    const total = await this.service.getTotalReserved(productId);

    res.json({
      success: true,
      data: { productId, totalReserved: total },
    });
  };

  cancelExpired = async (req: Request, res: Response) => {
    const count = await this.service.cancelExpired();

    res.json({
      success: true,
      data: { cancelledCount: count },
      message: `${count} reserva(s) expirada(s) cancelada(s) com sucesso`,
    });
  };
}
