import { db } from '../config/database';
import type {
  StorageSpace,
  StorageShelf,
  StorageSection,
  CreateStorageSpaceDTO,
  UpdateStorageSpaceDTO,
  CreateStorageShelfDTO,
  UpdateStorageShelfDTO,
  CreateStorageSectionDTO,
  UpdateStorageSectionDTO,
} from '@ejr/shared-types';

export class StorageLocationRepository {
  // ============================================
  // STORAGE SPACES (Espaços)
  // ============================================

  async findAllSpaces() {
    const query = `
      SELECT * FROM storage_spaces
      WHERE is_active = $1
      ORDER BY name ASC
    `;

    const result = await db.query(query, [true]);
    return result.rows.map(this.mapStorageSpaceFromDB);
  }

  async findSpaceById(id: string) {
    const query = 'SELECT * FROM storage_spaces WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapStorageSpaceFromDB(result.rows[0]);
  }

  async createSpace(spaceData: CreateStorageSpaceDTO) {
    const id = `space-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO storage_spaces (id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      spaceData.name,
      spaceData.description || null,
      spaceData.isActive ?? true,
    ]);

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar espaço');
    }

    return this.mapStorageSpaceFromDB(result.rows[0]);
  }

  async updateSpace(id: string, spaceData: UpdateStorageSpaceDTO) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (spaceData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(spaceData.name);
    }

    if (spaceData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(spaceData.description);
    }

    if (spaceData.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(spaceData.isActive);
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    params.push(id);

    const query = `
      UPDATE storage_spaces
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      throw new Error('Erro ao atualizar espaço');
    }

    return this.mapStorageSpaceFromDB(result.rows[0]);
  }

  async deleteSpace(id: string) {
    const query = 'DELETE FROM storage_spaces WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Espaço não encontrado');
    }

    return { success: true };
  }

  // ============================================
  // STORAGE SHELVES (Prateleiras)
  // ============================================

  async findAllShelves() {
    const query = `
      SELECT * FROM storage_shelves
      WHERE is_active = $1
      ORDER BY name ASC
    `;

    const result = await db.query(query, [true]);
    return result.rows.map(this.mapStorageShelfFromDB);
  }

  async findShelvesBySpaceId(spaceId: string) {
    const query = `
      SELECT * FROM storage_shelves
      WHERE space_id = $1 AND is_active = $2
      ORDER BY name ASC
    `;

    const result = await db.query(query, [spaceId, true]);
    return result.rows.map(this.mapStorageShelfFromDB);
  }

  async findShelfById(id: string) {
    const query = 'SELECT * FROM storage_shelves WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapStorageShelfFromDB(result.rows[0]);
  }

  async createShelf(shelfData: CreateStorageShelfDTO) {
    const id = `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO storage_shelves (id, space_id, name, description, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      shelfData.spaceId,
      shelfData.name,
      shelfData.description || null,
      shelfData.isActive ?? true,
    ]);

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar prateleira');
    }

    return this.mapStorageShelfFromDB(result.rows[0]);
  }

  async updateShelf(id: string, shelfData: UpdateStorageShelfDTO) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (shelfData.spaceId !== undefined) {
      updates.push(`space_id = $${paramIndex++}`);
      params.push(shelfData.spaceId);
    }

    if (shelfData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(shelfData.name);
    }

    if (shelfData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(shelfData.description);
    }

    if (shelfData.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(shelfData.isActive);
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    params.push(id);

    const query = `
      UPDATE storage_shelves
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      throw new Error('Erro ao atualizar prateleira');
    }

    return this.mapStorageShelfFromDB(result.rows[0]);
  }

  async deleteShelf(id: string) {
    const query = 'DELETE FROM storage_shelves WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Prateleira não encontrada');
    }

    return { success: true };
  }

  // ============================================
  // STORAGE SECTIONS (Seções)
  // ============================================

  async findAllSections() {
    const query = `
      SELECT * FROM storage_sections
      WHERE is_active = $1
      ORDER BY name ASC
    `;

    const result = await db.query(query, [true]);
    return result.rows.map(this.mapStorageSectionFromDB);
  }

  async findSectionsByShelfId(shelfId: string) {
    const query = `
      SELECT * FROM storage_sections
      WHERE shelf_id = $1 AND is_active = $2
      ORDER BY name ASC
    `;

    const result = await db.query(query, [shelfId, true]);
    return result.rows.map(this.mapStorageSectionFromDB);
  }

  async findSectionById(id: string) {
    const query = 'SELECT * FROM storage_sections WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return null;
    }

    return this.mapStorageSectionFromDB(result.rows[0]);
  }

  async createSection(sectionData: CreateStorageSectionDTO) {
    const id = `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const query = `
      INSERT INTO storage_sections (id, shelf_id, name, description, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      sectionData.shelfId,
      sectionData.name,
      sectionData.description || null,
      sectionData.isActive ?? true,
    ]);

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar seção');
    }

    return this.mapStorageSectionFromDB(result.rows[0]);
  }

  async updateSection(id: string, sectionData: UpdateStorageSectionDTO) {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (sectionData.shelfId !== undefined) {
      updates.push(`shelf_id = $${paramIndex++}`);
      params.push(sectionData.shelfId);
    }

    if (sectionData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(sectionData.name);
    }

    if (sectionData.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(sectionData.description);
    }

    if (sectionData.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(sectionData.isActive);
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    params.push(id);

    const query = `
      UPDATE storage_sections
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      throw new Error('Erro ao atualizar seção');
    }

    return this.mapStorageSectionFromDB(result.rows[0]);
  }

  async deleteSection(id: string) {
    const query = 'DELETE FROM storage_sections WHERE id = $1';

    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Seção não encontrada');
    }

    return { success: true };
  }

  // ============================================
  // MAPPERS
  // ============================================

  private mapStorageSpaceFromDB(data: any): StorageSpace {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapStorageShelfFromDB(data: any): StorageShelf {
    return {
      id: data.id,
      spaceId: data.space_id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapStorageSectionFromDB(data: any): StorageSection {
    return {
      id: data.id,
      shelfId: data.shelf_id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
