import { z } from 'zod';

export enum ServiceUnit {
  HORA = 'HORA',
  DIA = 'DIA',
  SERVICO = 'SERVICO',
  PROJETO = 'PROJETO',
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  defaultPrice: number; // centavos
  unit: ServiceUnit;
  durationMinutes?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateServiceSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(50),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  defaultPrice: z.number().int().min(0, 'Preço deve ser maior ou igual a zero'),
  unit: z.nativeEnum(ServiceUnit),
  durationMinutes: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateServiceSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  defaultPrice: z.number().int().min(0).optional(),
  unit: z.nativeEnum(ServiceUnit).optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateServiceDTO = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceDTO = z.infer<typeof UpdateServiceSchema>;
