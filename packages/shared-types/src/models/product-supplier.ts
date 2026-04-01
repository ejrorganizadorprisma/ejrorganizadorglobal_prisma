import { z } from 'zod';

// Interface para Product-Supplier (relacionamento many-to-many)
export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  supplierSku?: string; // Código do produto no catálogo do fornecedor
  unitPrice: number; // Preço unitário em centavos
  minimumQuantity: number; // Quantidade mínima de compra
  leadTimeDays: number; // Prazo de entrega específico
  isPreferred: boolean; // Se é o fornecedor preferencial
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema de validação para criar relacionamento produto-fornecedor
// Nota: productId vem pela URL, não no body
export const CreateProductSupplierSchema = z.object({
  supplierId: z.string().uuid('ID do fornecedor inválido'),
  supplierSku: z.string().max(100).optional(),
  unitPrice: z.number().int().min(0, 'Preço unitário não pode ser negativo'),
  minimumQuantity: z.number().int().min(1, 'Quantidade mínima deve ser pelo menos 1').default(1),
  leadTimeDays: z.number().int().min(0).default(0),
  isPreferred: z.boolean().default(false),
  notes: z.string().optional(),
});

// Schema de validação para atualizar relacionamento produto-fornecedor
export const UpdateProductSupplierSchema = z.object({
  supplierSku: z.string().max(100).optional().nullable(),
  unitPrice: z.number().int().min(0).optional(),
  minimumQuantity: z.number().int().min(1).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  isPreferred: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type CreateProductSupplierDTO = z.infer<typeof CreateProductSupplierSchema>;
export type UpdateProductSupplierDTO = z.infer<typeof UpdateProductSupplierSchema>;
