import type { Request, Response } from 'express';
import { GoodsReceiptsService } from '../services/goods-receipts.service';

export class GoodsReceiptsController {
  private service: GoodsReceiptsService;

  constructor() {
    this.service = new GoodsReceiptsService();
  }

  findMany = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const supplierId = req.query.supplierId as string | undefined;
      const purchaseOrderId = req.query.purchaseOrderId as string | undefined;

      const result = await this.service.findMany({
        page,
        limit,
        search,
        status,
        supplierId,
        purchaseOrderId,
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
      const receipt = await this.service.findById(id);

      res.json({
        success: true,
        data: receipt,
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

  findByReceiptNumber = async (req: Request, res: Response) => {
    try {
      const { receiptNumber } = req.params;
      const receipt = await this.service.findByReceiptNumber(receiptNumber);

      res.json({
        success: true,
        data: receipt,
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
      const receipt = await this.service.create(req.body);

      res.status(201).json({
        success: true,
        data: receipt,
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
      const receipt = await this.service.update(id, req.body);

      res.json({
        success: true,
        data: receipt,
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
        message: 'Recebimento deletado com sucesso',
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

      const receipt = await this.service.updateStatus(id, status);

      res.json({
        success: true,
        data: receipt,
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

  // Controle de qualidade
  inspectItem = async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      const item = await this.service.inspectItem(itemId, req.body);

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

  approveReceipt = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      if (!approvedBy) {
        return res.status(400).json({
          success: false,
          error: 'Campo approvedBy é obrigatório',
        });
      }

      const receipt = await this.service.approveReceipt(id, approvedBy);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  rejectReceipt = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { inspectedBy, reason } = req.body;

      const receipt = await this.service.rejectReceipt(
        id,
        inspectedBy || 'Sistema',
        reason || 'Rejeitado pelo usuario'
      );

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // Relatórios
  getReceiptsBySupplier = async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      const result = await this.service.getReceiptsBySupplier(supplierId);

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

  getPendingInspections = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getPendingInspections();

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

  getReceiptsByPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId } = req.params;
      const result = await this.service.getReceiptsByPurchaseOrder(purchaseOrderId);

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
}
