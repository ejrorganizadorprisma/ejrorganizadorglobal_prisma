import { Request, Response } from 'express';
import { DigitalFabricationRepository } from '../repositories/digital-fabrication.repository';
import {
  CreateFabricationMachineSchema,
  UpdateFabricationMachineSchema,
  CreateDigitalFabricationBatchSchema,
  UpdateDigitalFabricationBatchSchema,
  CreateDigitalFabricationItemSchema,
  UpdateDigitalFabricationItemSchema,
  RegisterMaterialConsumptionSchema,
  CompleteFabricationItemSchema,
  FabricationMachineType,
  FabricationJobStatus,
} from '@ejr/shared-types';

const repository = new DigitalFabricationRepository();

export class DigitalFabricationController {
  // ============================================
  // MACHINES
  // ============================================

  async findAllMachines(req: Request, res: Response) {
    const { type, isActive } = req.query;

    const machines = await repository.findAllMachines({
      type: type as FabricationMachineType | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    return res.json({
      success: true,
      data: machines,
    });
  }

  async findMachineById(req: Request, res: Response) {
    const { id } = req.params;

    const machine = await repository.findMachineById(id);
    if (!machine) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Máquina não encontrada' },
      });
    }

    return res.json({
      success: true,
      data: machine,
    });
  }

  async createMachine(req: Request, res: Response) {
    const validation = CreateFabricationMachineSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const machine = await repository.createMachine(validation.data);

    return res.status(201).json({
      success: true,
      data: machine,
    });
  }

  async updateMachine(req: Request, res: Response) {
    const { id } = req.params;
    const validation = UpdateFabricationMachineSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const machine = await repository.updateMachine(id, validation.data);

    return res.json({
      success: true,
      data: machine,
    });
  }

  async deleteMachine(req: Request, res: Response) {
    const { id } = req.params;

    await repository.deleteMachine(id);

    return res.json({
      success: true,
      message: 'Máquina excluída com sucesso',
    });
  }

  // ============================================
  // BATCHES
  // ============================================

  async findManyBatches(req: Request, res: Response) {
    const {
      page = '1',
      limit = '20',
      machineType,
      status,
      machineId,
      operatorId,
    } = req.query;

    const result = await repository.findManyBatches({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      machineType: machineType as FabricationMachineType | undefined,
      status: status as FabricationJobStatus | undefined,
      machineId: machineId as string | undefined,
      operatorId: operatorId as string | undefined,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string, 10)),
      },
    });
  }

  async findBatchById(req: Request, res: Response) {
    const { id } = req.params;

    const batch = await repository.findBatchById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lote não encontrado' },
      });
    }

    return res.json({
      success: true,
      data: batch,
    });
  }

  async createBatch(req: Request, res: Response) {
    const validation = CreateDigitalFabricationBatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.createBatch(validation.data, userId);

    return res.status(201).json({
      success: true,
      data: batch,
    });
  }

  async updateBatch(req: Request, res: Response) {
    const { id } = req.params;
    const validation = UpdateDigitalFabricationBatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, validation.data, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async deleteBatch(req: Request, res: Response) {
    const { id } = req.params;

    await repository.deleteBatch(id);

    return res.json({
      success: true,
      message: 'Lote excluído com sucesso',
    });
  }

  // Lifecycle actions
  async startBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'IN_PROGRESS' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async pauseBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'PAUSED' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async resumeBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'IN_PROGRESS' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async completeBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'COMPLETED' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async cancelBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'CANCELLED' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  async failBatch(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const batch = await repository.updateBatch(id, { status: 'FAILED' }, userId);

    return res.json({
      success: true,
      data: batch,
    });
  }

  // ============================================
  // ITEMS
  // ============================================

  async findItemsByBatchId(req: Request, res: Response) {
    const { id } = req.params;

    const items = await repository.findItemsByBatchId(id);

    return res.json({
      success: true,
      data: items,
    });
  }

  async findItemById(req: Request, res: Response) {
    const { itemId } = req.params;

    const item = await repository.findItemById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item não encontrado' },
      });
    }

    return res.json({
      success: true,
      data: item,
    });
  }

  async createItem(req: Request, res: Response) {
    const validation = CreateDigitalFabricationItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const item = await repository.createItem(validation.data);

    return res.status(201).json({
      success: true,
      data: item,
    });
  }

  async updateItem(req: Request, res: Response) {
    const { itemId } = req.params;
    const validation = UpdateDigitalFabricationItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const item = await repository.updateItem(itemId, validation.data);

    return res.json({
      success: true,
      data: item,
    });
  }

  async deleteItem(req: Request, res: Response) {
    const { itemId } = req.params;

    await repository.deleteItem(itemId);

    return res.json({
      success: true,
      message: 'Item excluído com sucesso',
    });
  }

  async completeItem(req: Request, res: Response) {
    const { itemId } = req.params;
    const validation = CompleteFabricationItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const item = await repository.completeItem(itemId, validation.data, userId);

    return res.json({
      success: true,
      data: item,
    });
  }

  // ============================================
  // MATERIAL CONSUMPTION
  // ============================================

  async findConsumptionByBatchId(req: Request, res: Response) {
    const { id } = req.params;

    const consumption = await repository.findConsumptionByBatchId(id);

    return res.json({
      success: true,
      data: consumption,
    });
  }

  async registerConsumption(req: Request, res: Response) {
    const validation = RegisterMaterialConsumptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: validation.error.errors },
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Usuário não autenticado' },
      });
    }

    const consumption = await repository.registerConsumption(validation.data, userId);

    return res.status(201).json({
      success: true,
      data: consumption,
    });
  }

  // ============================================
  // HISTORY
  // ============================================

  async findHistoryByBatchId(req: Request, res: Response) {
    const { id } = req.params;

    const history = await repository.findHistoryByBatchId(id);

    return res.json({
      success: true,
      data: history,
    });
  }

  // ============================================
  // DASHBOARD & STATS
  // ============================================

  async getDashboardStats(req: Request, res: Response) {
    const stats = await repository.getDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  }

  async getBatchSummaries(req: Request, res: Response) {
    const { machineType } = req.query;

    const summaries = await repository.getBatchSummaries(
      machineType as FabricationMachineType | undefined
    );

    return res.json({
      success: true,
      data: summaries,
    });
  }
}
