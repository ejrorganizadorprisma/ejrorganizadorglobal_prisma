import { z } from 'zod';

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  document: string; // CPF ou CNPJ
  email?: string;
  phone?: string;
  address?: Address;
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
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
});

export const CreateCustomerSchema = z.object({
  type: z.nativeEnum(CustomerType),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  document: z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF ou CNPJ inválido'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  address: AddressSchema.optional(),
});

export const UpdateCustomerSchema = z.object({
  type: z.nativeEnum(CustomerType).optional(),
  name: z.string().min(2).optional(),
  document: z.string().regex(/^\d{11}$|^\d{14}$/).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: AddressSchema.optional().nullable(),
});

export type CreateCustomerDTO = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerDTO = z.infer<typeof UpdateCustomerSchema>;
