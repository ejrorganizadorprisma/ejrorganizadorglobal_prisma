import { z } from 'zod';
import { Currency } from './system-settings';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
}

export enum ProductUnit {
  UNIT = 'UNIT',
  METER = 'METER',
  WEIGHT = 'WEIGHT',
  LITER = 'LITER',
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  family?: string;
  manufacturer?: string;
  // Preços com suas respectivas moedas
  costPrice: number; // valor numérico (centavos para BRL/USD, unidades para PYG)
  costPriceCurrency: Currency; // moeda do preço de custo
  salePrice: number; // valor numérico
  salePriceCurrency: Currency; // moeda do preço de venda
  wholesalePrice: number; // valor numérico
  wholesalePriceCurrency: Currency; // moeda do preço atacado
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
  unit: ProductUnit; // unidade de medida
  // Extra fields
  factoryCode?: string;
  warrantyExpirationDate?: string;
  observations?: string;
  quantityPerBox?: number;
  // Storage location fields
  spaceId?: string;
  shelfId?: string;
  sectionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProductSchema = z.object({
  code: z.string().optional(), // Auto-generated, optional in creation
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  family: z.string().optional(),
  manufacturer: z.string().optional(),
  costPrice: z.number().int().min(0, 'Preço de custo não pode ser negativo'),
  costPriceCurrency: z.enum(['BRL', 'USD', 'PYG']).default('BRL'),
  salePrice: z.number().int().min(0, 'Preço de venda não pode ser negativo'),
  salePriceCurrency: z.enum(['BRL', 'USD', 'PYG']).default('BRL'),
  wholesalePrice: z.number().int().min(0, 'Preço de venda atacado não pode ser negativo').default(0),
  wholesalePriceCurrency: z.enum(['BRL', 'USD', 'PYG']).default('BRL'),
  technicalDescription: z.string().optional(),
  commercialDescription: z.string().optional(),
  warrantyMonths: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0).default(5),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  imageUrls: z.array(z.string()).default([]),
  isAssembly: z.boolean().default(false),
  isPart: z.boolean().default(false),
  assemblyCost: z.number().int().min(0).default(0),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.UNIT),
  factoryCode: z.string().optional(),
  warrantyExpirationDate: z.string().optional(),
  observations: z.string().optional(),
  quantityPerBox: z.number().int().min(1).optional().default(1),
  spaceId: z.string().optional(),
  shelfId: z.string().optional(),
  sectionId: z.string().optional(),
});

export const UpdateProductSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  category: z.string().min(1).optional(),
  family: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  costPrice: z.number().int().min(0).optional(),
  costPriceCurrency: z.enum(['BRL', 'USD', 'PYG']).optional(),
  salePrice: z.number().int().min(0).optional(),
  salePriceCurrency: z.enum(['BRL', 'USD', 'PYG']).optional(),
  wholesalePrice: z.number().int().min(0).optional(),
  wholesalePriceCurrency: z.enum(['BRL', 'USD', 'PYG']).optional(),
  technicalDescription: z.string().optional().nullable(),
  commercialDescription: z.string().optional().nullable(),
  warrantyMonths: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  imageUrls: z.array(z.string()).optional(),
  isAssembly: z.boolean().optional(),
  isPart: z.boolean().optional(),
  assemblyCost: z.number().int().min(0).optional(),
  unit: z.nativeEnum(ProductUnit).optional(),
  factoryCode: z.string().optional().nullable(),
  warrantyExpirationDate: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  quantityPerBox: z.number().int().min(1).optional(),
  spaceId: z.string().optional().nullable(),
  shelfId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;
export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

// ABC Classification for demand analysis
export type AbcClassification = 'A' | 'B' | 'C';
export type ConsumptionTrend = 'INCREASING' | 'STABLE' | 'DECREASING';

export interface MonthlyConsumption {
  month: string; // YYYY-MM
  quantity: number;
}

export type DemandAnalysisPeriod = 3 | 6 | 12 | 24;

export interface DemandAnalysis {
  productId: string;
  productName: string;
  productCode: string;
  periodMonths: DemandAnalysisPeriod;
  // Stock data
  currentStock: number;
  minimumStock: number;
  // ABC Classification
  abcClass: AbcClassification;
  annualValue: number; // cost_price × annual consumption
  // Consumption metrics
  avgMonthlyConsumption: number;
  avgDailyDemand: number;
  monthlyBreakdown: MonthlyConsumption[];
  trend: ConsumptionTrend;
  trendPercentage: number; // e.g. +15% or -20%
  // Safety & reorder
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  // Reservations
  activeReservations: number;
  // Suggestion
  suggestedQuantity: number;
  daysOfStockRemaining: number;
  minimumLotQuantity: number;
  // Preferred supplier
  preferredSupplier?: {
    name: string;
    leadTimeDays: number;
    unitPrice: number;
    minimumQuantity: number;
  };
}
