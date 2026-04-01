import { z } from 'zod';

// ============================================
// PRODUCT CATEGORY (Categoria de Produto)
// ============================================

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProductCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateProductCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateProductCategoryDTO = z.infer<typeof CreateProductCategorySchema>;
export type UpdateProductCategoryDTO = z.infer<typeof UpdateProductCategorySchema>;
