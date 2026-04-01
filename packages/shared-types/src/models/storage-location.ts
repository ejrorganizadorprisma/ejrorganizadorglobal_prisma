import { z } from 'zod';

// ============================================
// STORAGE SPACE (Espaço)
// ============================================

export interface StorageSpace {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateStorageSpaceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateStorageSpaceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateStorageSpaceDTO = z.infer<typeof CreateStorageSpaceSchema>;
export type UpdateStorageSpaceDTO = z.infer<typeof UpdateStorageSpaceSchema>;

// ============================================
// STORAGE SHELF (Prateleira)
// ============================================

export interface StorageShelf {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateStorageShelfSchema = z.object({
  spaceId: z.string().min(1, 'Espaço é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateStorageShelfSchema = z.object({
  spaceId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateStorageShelfDTO = z.infer<typeof CreateStorageShelfSchema>;
export type UpdateStorageShelfDTO = z.infer<typeof UpdateStorageShelfSchema>;

// ============================================
// STORAGE SECTION (Seção)
// ============================================

export interface StorageSection {
  id: string;
  shelfId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateStorageSectionSchema = z.object({
  shelfId: z.string().min(1, 'Prateleira é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateStorageSectionSchema = z.object({
  shelfId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateStorageSectionDTO = z.infer<typeof CreateStorageSectionSchema>;
export type UpdateStorageSectionDTO = z.infer<typeof UpdateStorageSectionSchema>;

// ============================================
// HELPER TYPES
// ============================================

// Tipo para exibir a localização completa de um produto
export interface ProductLocation {
  spaceId?: string;
  spaceName?: string;
  shelfId?: string;
  shelfName?: string;
  sectionId?: string;
  sectionName?: string;
}
