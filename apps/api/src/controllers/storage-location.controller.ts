import { Request, Response } from 'express';
import { StorageLocationService } from '../services/storage-location.service';
import { logger } from '../config/logger';

const service = new StorageLocationService();

export class StorageLocationController {
  // ============================================
  // STORAGE SPACES (Espaços)
  // ============================================

  async getAllSpaces(req: Request, res: Response) {
    try {
      const spaces = await service.getAllSpaces();
      res.json({ success: true, data: spaces });
    } catch (error: any) {
      logger.error('Erro ao buscar espaços:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar espaços' },
      });
    }
  }

  async getSpaceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const space = await service.getSpaceById(id);
      res.json({ success: true, data: space });
    } catch (error: any) {
      logger.error('Erro ao buscar espaço:', error);
      const status = error.message === 'Espaço não encontrado' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar espaço' },
      });
    }
  }

  async createSpace(req: Request, res: Response) {
    try {
      const space = await service.createSpace(req.body);
      res.status(201).json({ success: true, data: space });
    } catch (error: any) {
      logger.error('Erro ao criar espaço:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Erro ao criar espaço' },
      });
    }
  }

  async updateSpace(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const space = await service.updateSpace(id, req.body);
      res.json({ success: true, data: space });
    } catch (error: any) {
      logger.error('Erro ao atualizar espaço:', error);
      const status = error.message === 'Espaço não encontrado' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao atualizar espaço' },
      });
    }
  }

  async deleteSpace(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.deleteSpace(id);
      res.json({ success: true, message: 'Espaço deletado com sucesso' });
    } catch (error: any) {
      logger.error('Erro ao deletar espaço:', error);
      const status = error.message === 'Espaço não encontrado' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao deletar espaço' },
      });
    }
  }

  // ============================================
  // STORAGE SHELVES (Prateleiras)
  // ============================================

  async getAllShelves(req: Request, res: Response) {
    try {
      const { spaceId } = req.query;

      const shelves = spaceId
        ? await service.getShelvesBySpaceId(spaceId as string)
        : await service.getAllShelves();

      res.json({ success: true, data: shelves });
    } catch (error: any) {
      logger.error('Erro ao buscar prateleiras:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar prateleiras' },
      });
    }
  }

  async getShelfById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shelf = await service.getShelfById(id);
      res.json({ success: true, data: shelf });
    } catch (error: any) {
      logger.error('Erro ao buscar prateleira:', error);
      const status = error.message === 'Prateleira não encontrada' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar prateleira' },
      });
    }
  }

  async createShelf(req: Request, res: Response) {
    try {
      const shelf = await service.createShelf(req.body);
      res.status(201).json({ success: true, data: shelf });
    } catch (error: any) {
      logger.error('Erro ao criar prateleira:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Erro ao criar prateleira' },
      });
    }
  }

  async updateShelf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shelf = await service.updateShelf(id, req.body);
      res.json({ success: true, data: shelf });
    } catch (error: any) {
      logger.error('Erro ao atualizar prateleira:', error);
      const status = error.message === 'Prateleira não encontrada' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao atualizar prateleira' },
      });
    }
  }

  async deleteShelf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.deleteShelf(id);
      res.json({ success: true, message: 'Prateleira deletada com sucesso' });
    } catch (error: any) {
      logger.error('Erro ao deletar prateleira:', error);
      const status = error.message === 'Prateleira não encontrada' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao deletar prateleira' },
      });
    }
  }

  // ============================================
  // STORAGE SECTIONS (Seções)
  // ============================================

  async getAllSections(req: Request, res: Response) {
    try {
      const { shelfId } = req.query;

      const sections = shelfId
        ? await service.getSectionsByShelfId(shelfId as string)
        : await service.getAllSections();

      res.json({ success: true, data: sections });
    } catch (error: any) {
      logger.error('Erro ao buscar seções:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar seções' },
      });
    }
  }

  async getSectionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const section = await service.getSectionById(id);
      res.json({ success: true, data: section });
    } catch (error: any) {
      logger.error('Erro ao buscar seção:', error);
      const status = error.message === 'Seção não encontrada' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao buscar seção' },
      });
    }
  }

  async createSection(req: Request, res: Response) {
    try {
      const section = await service.createSection(req.body);
      res.status(201).json({ success: true, data: section });
    } catch (error: any) {
      logger.error('Erro ao criar seção:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message || 'Erro ao criar seção' },
      });
    }
  }

  async updateSection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const section = await service.updateSection(id, req.body);
      res.json({ success: true, data: section });
    } catch (error: any) {
      logger.error('Erro ao atualizar seção:', error);
      const status = error.message === 'Seção não encontrada' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao atualizar seção' },
      });
    }
  }

  async deleteSection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await service.deleteSection(id);
      res.json({ success: true, message: 'Seção deletada com sucesso' });
    } catch (error: any) {
      logger.error('Erro ao deletar seção:', error);
      const status = error.message === 'Seção não encontrada' ? 404 : 400;
      res.status(status).json({
        success: false,
        error: { message: error.message || 'Erro ao deletar seção' },
      });
    }
  }
}
