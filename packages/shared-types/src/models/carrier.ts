import { z } from 'zod';

// Transportadora — usada na Expedição para coleta das vendas.
export type CarrierStatus = 'ACTIVE' | 'INACTIVE';

export interface Carrier {
  id: string;
  code?: string;
  name: string;
  document?: string;    // CNPJ / RUC
  phone?: string;
  email?: string;
  contactName?: string;
  city?: string;
  notes?: string;
  status: CarrierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateCarrierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const UpdateCarrierSchema = CreateCarrierSchema.partial();

export type CreateCarrierDTO = z.infer<typeof CreateCarrierSchema>;
export type UpdateCarrierDTO = z.infer<typeof UpdateCarrierSchema>;
