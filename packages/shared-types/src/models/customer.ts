import { z } from 'zod';

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export enum CustomerApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode?: string;
}

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  document?: string; // CPF ou CNPJ (BR)
  ci?: string;       // Cédula de Identidad (Paraguay)
  ruc?: string;      // Registro Único de Contribuyente (Paraguay)
  email?: string;
  phone?: string;
  address?: Address;
  allowedPaymentMethods?: string[];
  creditMaxDays?: number | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  approvalStatus?: CustomerApprovalStatus;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  deletedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (UF)'),
  zipCode: z.string().optional(),
});

export const CreateCustomerSchema = z.object({
  type: z.nativeEnum(CustomerType),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  document: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF ou CNPJ inválido').optional()
  ),
  ci: z.string().max(20).optional(),
  ruc: z.string().max(20).optional(),
  email: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().email('Email inválido').optional()
  ),
  phone: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  address: z.preprocess(
    (val) => (val === null ? undefined : val),
    AddressSchema.optional()
  ),
  allowedPaymentMethods: z.array(z.string()).optional(),
  creditMaxDays: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.number().int().min(1).nullable().optional()
  ),
  responsibleUserId: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().nullable().optional()
  ),
});

export const UpdateCustomerSchema = z.object({
  type: z.nativeEnum(CustomerType).optional(),
  name: z.string().min(2).optional(),
  document: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().regex(/^\d{11}$|^\d{14}$/).optional()
  ),
  ci: z.string().max(20).optional(),
  ruc: z.string().max(20).optional(),
  email: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().email().optional()
  ),
  phone: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  address: z.preprocess(
    (val) => (val === null ? undefined : val),
    AddressSchema.optional()
  ),
  allowedPaymentMethods: z.array(z.string()).optional(),
  creditMaxDays: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.number().int().min(1).nullable().optional()
  ),
  responsibleUserId: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().nullable().optional()
  ),
});

export type CreateCustomerDTO = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerDTO = z.infer<typeof UpdateCustomerSchema>;
