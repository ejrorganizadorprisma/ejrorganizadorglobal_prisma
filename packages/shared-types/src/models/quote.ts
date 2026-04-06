import { z } from 'zod';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export enum QuoteItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  itemType: QuoteItemType;
  productId?: string; // Obrigatório se itemType = PRODUCT
  serviceName?: string; // Obrigatório se itemType = SERVICE
  serviceDescription?: string; // Opcional para serviços
  quantity: number;
  unitPrice: number; // centavos
  total: number; // quantity * unitPrice
  product?: {
    name: string;
    code: string;
    factoryCode?: string;
  };
}

export interface Quote {
  id: string;
  quoteNumber: string; // QOT-2025-0001
  customerId: string;
  items: QuoteItem[];
  subtotal: number; // centavos
  discount: number; // centavos
  total: number; // centavos
  status: QuoteStatus;
  validUntil: Date;
  notes?: string;
  responsibleUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteItemSchema = z.discriminatedUnion('itemType', [
  // Schema para itens de produto
  z.object({
    itemType: z.literal(QuoteItemType.PRODUCT),
    productId: z.string().min(1, 'Produto é obrigatório'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
    unitPrice: z.number().int().min(0, 'Preço unitário não pode ser negativo'),
  }).passthrough(),
  // Schema para itens de serviço
  z.object({
    itemType: z.literal(QuoteItemType.SERVICE),
    serviceName: z.string().min(1, 'Nome do serviço é obrigatório'),
    serviceDescription: z.string().optional(),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
    unitPrice: z.number().int().min(0, 'Preço unitário não pode ser negativo'),
  }).passthrough(),
]);

export const CreateQuoteSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  items: z.array(QuoteItemSchema).min(1, 'Orçamento deve ter pelo menos 1 item'),
  discount: z.number().int().min(0).default(0),
  validUntil: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data de validade inválida'),
  notes: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const UpdateQuoteSchema = z.object({
  customerId: z.string().min(1).optional(),
  items: z.array(QuoteItemSchema).min(1).optional(),
  discount: z.number().int().min(0).optional(),
  validUntil: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data de validade inválida').optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(QuoteStatus).optional(),
});

export interface CreateQuoteItemDTO {
  itemType: QuoteItemType;
  productId?: string;
  serviceName?: string;
  serviceDescription?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateQuoteDTO {
  customerId: string;
  items: CreateQuoteItemDTO[];
  discount: number;
  validUntil: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateQuoteDTO {
  customerId?: string;
  items?: CreateQuoteItemDTO[];
  discount?: number;
  validUntil?: string;
  notes?: string | null;
  status?: QuoteStatus;
}

export type QuoteItemInput = CreateQuoteItemDTO;
