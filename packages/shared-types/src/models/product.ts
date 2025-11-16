import { z } from 'zod';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer?: string;
  costPrice: number; // centavos
  salePrice: number; // centavos
  technicalDescription?: string;
  commercialDescription?: string;
  warrantyMonths: number;
  currentStock: number;
  minimumStock: number;
  status: ProductStatus;
  imageUrls: string[];
  // BOM fields
  isAssembly: boolean; // produto montado a partir de peças
  isPart: boolean; // é uma peça componente
  assemblyCost: number; // custo de montagem (centavos)
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProductSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  manufacturer: z.string().optional(),
  costPrice: z.number().int().positive('Preço de custo deve ser maior que zero'),
  salePrice: z.number().int().positive('Preço de venda deve ser maior que zero'),
  technicalDescription: z.string().optional(),
  commercialDescription: z.string().optional(),
  warrantyMonths: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0).default(5),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  isAssembly: z.boolean().default(false),
  isPart: z.boolean().default(false),
  assemblyCost: z.number().int().min(0).default(0),
});

export const UpdateProductSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  category: z.string().min(1).optional(),
  manufacturer: z.string().optional().nullable(),
  costPrice: z.number().int().positive().optional(),
  salePrice: z.number().int().positive().optional(),
  technicalDescription: z.string().optional().nullable(),
  commercialDescription: z.string().optional().nullable(),
  warrantyMonths: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;
export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;
