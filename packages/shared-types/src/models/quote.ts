import { z } from 'zod';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  quantity: number;
  unitPrice: number; // centavos
  total: number; // quantity * unitPrice
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

const QuoteItemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.number().int().positive('Preço unitário deve ser maior que zero'),
});

export const CreateQuoteSchema = z.object({
  customerId: z.string().uuid('ID do cliente inválido'),
  items: z.array(QuoteItemSchema).min(1, 'Orçamento deve ter pelo menos 1 item'),
  discount: z.number().int().min(0).default(0),
  validUntil: z.string().datetime('Data de validade inválida'),
  notes: z.string().optional(),
});

export const UpdateQuoteSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(QuoteItemSchema).min(1).optional(),
  discount: z.number().int().min(0).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(QuoteStatus).optional(),
});

export type CreateQuoteDTO = z.infer<typeof CreateQuoteSchema>;
export type UpdateQuoteDTO = z.infer<typeof UpdateQuoteSchema>;
export type QuoteItemInput = z.infer<typeof QuoteItemSchema>;
