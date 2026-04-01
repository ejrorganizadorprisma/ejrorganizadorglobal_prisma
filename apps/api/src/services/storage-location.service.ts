import { StorageLocationRepository } from '../repositories/storage-location.repository';
import type {
  CreateStorageSpaceDTO,
  UpdateStorageSpaceDTO,
  CreateStorageShelfDTO,
  UpdateStorageShelfDTO,
  CreateStorageSectionDTO,
  UpdateStorageSectionDTO,
} from '@ejr/shared-types';

const repository = new StorageLocationRepository();

export class StorageLocationService {
  // ============================================
  // STORAGE SPACES (Espaços)
  // ============================================

  async getAllSpaces() {
    return await repository.findAllSpaces();
  }

  async getSpaceById(id: string) {
    const space = await repository.findSpaceById(id);
    if (!space) {
      throw new Error('Espaço não encontrado');
    }
    return space;
  }

  async createSpace(data: CreateStorageSpaceDTO) {
    return await repository.createSpace(data);
  }

  async updateSpace(id: string, data: UpdateStorageSpaceDTO) {
    const space = await repository.findSpaceById(id);
    if (!space) {
      throw new Error('Espaço não encontrado');
    }
    return await repository.updateSpace(id, data);
  }

  async deleteSpace(id: string) {
    const space = await repository.findSpaceById(id);
    if (!space) {
      throw new Error('Espaço não encontrado');
    }

    // Verificar se existem prateleiras vinculadas
    const shelves = await repository.findShelvesBySpaceId(id);
    if (shelves.length > 0) {
      throw new Error('Não é possível excluir um espaço com prateleiras vinculadas');
    }

    return await repository.deleteSpace(id);
  }

  // ============================================
  // STORAGE SHELVES (Prateleiras)
  // ============================================

  async getAllShelves() {
    return await repository.findAllShelves();
  }

  async getShelvesBySpaceId(spaceId: string) {
    return await repository.findShelvesBySpaceId(spaceId);
  }

  async getShelfById(id: string) {
    const shelf = await repository.findShelfById(id);
    if (!shelf) {
      throw new Error('Prateleira não encontrada');
    }
    return shelf;
  }

  async createShelf(data: CreateStorageShelfDTO) {
    // Verificar se o espaço existe
    const space = await repository.findSpaceById(data.spaceId);
    if (!space) {
      throw new Error('Espaço não encontrado');
    }
    return await repository.createShelf(data);
  }

  async updateShelf(id: string, data: UpdateStorageShelfDTO) {
    const shelf = await repository.findShelfById(id);
    if (!shelf) {
      throw new Error('Prateleira não encontrada');
    }

    // Se está mudando de espaço, verificar se o novo espaço existe
    if (data.spaceId) {
      const space = await repository.findSpaceById(data.spaceId);
      if (!space) {
        throw new Error('Espaço não encontrado');
      }
    }

    return await repository.updateShelf(id, data);
  }

  async deleteShelf(id: string) {
    const shelf = await repository.findShelfById(id);
    if (!shelf) {
      throw new Error('Prateleira não encontrada');
    }

    // Verificar se existem seções vinculadas
    const sections = await repository.findSectionsByShelfId(id);
    if (sections.length > 0) {
      throw new Error('Não é possível excluir uma prateleira com seções vinculadas');
    }

    return await repository.deleteShelf(id);
  }

  // ============================================
  // STORAGE SECTIONS (Seções)
  // ============================================

  async getAllSections() {
    return await repository.findAllSections();
  }

  async getSectionsByShelfId(shelfId: string) {
    return await repository.findSectionsByShelfId(shelfId);
  }

  async getSectionById(id: string) {
    const section = await repository.findSectionById(id);
    if (!section) {
      throw new Error('Seção não encontrada');
    }
    return section;
  }

  async createSection(data: CreateStorageSectionDTO) {
    // Verificar se a prateleira existe
    const shelf = await repository.findShelfById(data.shelfId);
    if (!shelf) {
      throw new Error('Prateleira não encontrada');
    }
    return await repository.createSection(data);
  }

  async updateSection(id: string, data: UpdateStorageSectionDTO) {
    const section = await repository.findSectionById(id);
    if (!section) {
      throw new Error('Seção não encontrada');
    }

    // Se está mudando de prateleira, verificar se a nova prateleira existe
    if (data.shelfId) {
      const shelf = await repository.findShelfById(data.shelfId);
      if (!shelf) {
        throw new Error('Prateleira não encontrada');
      }
    }

    return await repository.updateSection(id, data);
  }

  async deleteSection(id: string) {
    const section = await repository.findSectionById(id);
    if (!section) {
      throw new Error('Seção não encontrada');
    }

    return await repository.deleteSection(id);
  }
}
