import { z } from 'zod';

// ============================================
// PRODUCT FAMILY (Família de Produto)
// ============================================

export interface ProductFamily {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProductFamilySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateProductFamilySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateProductFamilyDTO = z.infer<typeof CreateProductFamilySchema>;
export type UpdateProductFamilyDTO = z.infer<typeof UpdateProductFamilySchema>;
