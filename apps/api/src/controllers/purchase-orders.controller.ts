import type { Request, Response } from 'express';
import { PurchaseOrdersService } from '../services/purchase-orders.service';

export class PurchaseOrdersController {
  private service: PurchaseOrdersService;

  constructor() {
    this.service = new PurchaseOrdersService();
  }

  findMany = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const supplierId = req.query.supplierId as string | undefined;

      const result = await this.service.findMany({
        page,
        limit,
        search,
        status,
        supplierId,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  findById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.service.findById(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes('não encontrad')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  };

  findByOrderNumber = async (req: Request, res: Response) => {
    try {
      const { orderNumber } = req.params;
      const order = await this.service.findByOrderNumber(orderNumber);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes('não encontrad')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const order = await this.service.create(req.body);

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.service.update(id, req.body);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes('não encontrad')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);

      res.json({
        success: true,
        message: 'Ordem de compra deletada com sucesso',
      });
    } catch (error: any) {
      if (error.message.includes('não encontrad')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await this.service.updateStatus(id, status);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes('não encontrad')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }
  };

  sendOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.service.sendOrder(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  confirmOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.service.confirmOrder(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  cancelOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.service.cancelOrder(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  approveOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          error: 'Campo approvedBy é obrigatório',
        });
      }

      const order = await this.service.approveOrder(id, approvedBy);

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // Gerenciamento de itens
  getItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await this.service.getItems(id);

      res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  addItem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await this.service.addItem(id, req.body);

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  updateItem = async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      const item = await this.service.updateItem(itemId, req.body);

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  deleteItem = async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      await this.service.deleteItem(itemId);

      res.json({
        success: true,
        message: 'Item deletado com sucesso',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // Relatórios
  getOrdersBySupplier = async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      const result = await this.service.getOrdersBySupplier(supplierId);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  getPendingOrders = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getPendingOrders();

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  getOrdersWithPendingDelivery = async (req: Request, res: Response) => {
    try {
      const orders = await this.service.getOrdersWithPendingDelivery();

      res.json({
        success: true,
        data: orders,
        total: orders.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
}
