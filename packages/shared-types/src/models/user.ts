import { z } from 'zod';
import type { Address } from './customer';

export enum UserRole {
  OWNER = 'OWNER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  COORDINATOR = 'COORDINATOR',
  SALESPERSON = 'SALESPERSON',
  STOCK = 'STOCK',
  PRODUCTION = 'PRODUCTION',
  TECHNICIAN = 'TECHNICIAN',
  MONITOR = 'MONITOR',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  // Extended profile - personal data
  document?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  emailAlt?: string | null;
  address?: Address | null;
  photoUrl?: string | null;
  // Extended profile - commercial data (primarily for SALESPERSON role)
  commissionRate?: number | null;
  monthlyTarget?: number | null; // armazenado em centavos
  region?: string | null;
  // Extended profile - contractual data
  hireDate?: string | null;
  contractType?: string | null;
  notes?: string | null;
  allowedHours?: {
    // Nova estrutura: horários por dia da semana
    weekSchedule?: {
      [dayOfWeek: number]: Array<{
        start: string; // "08:00"
        end: string; // "17:00"
      }>;
    };
    // Estrutura antiga (mantida para compatibilidade)
    timeRanges?: Array<{
      start: string; // "08:00"
      end: string; // "11:25"
    }>;
    days?: number[]; // [0,1,2,3,4,5,6] onde 0=Domingo, 1=Segunda, etc
  };
  createdAt: Date;
  updatedAt: Date;
}

const timeRangeSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
});

const userAddressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (UF)'),
  zipCode: z.string().optional(),
});

// Helper to coerce empty strings to null/undefined for optional text fields
const optionalNullableString = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string().nullable().optional()
);

const optionalNullableDate = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string().nullable().optional()
);

const optionalNullableNumber = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.number().nullable().optional()
);

const optionalNullableInt = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.number().int().nullable().optional()
);

const optionalNullableAddress = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  userAddressSchema.nullable().optional()
);

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.nativeEnum(UserRole),
  // Personal data
  document: optionalNullableString,
  birthDate: optionalNullableDate,
  phone: optionalNullableString,
  whatsapp: optionalNullableString,
  emailAlt: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().email('Email alternativo inválido').nullable().optional()
  ),
  address: optionalNullableAddress,
  photoUrl: optionalNullableString,
  // Commercial data
  commissionRate: optionalNullableNumber,
  monthlyTarget: optionalNullableInt,
  region: optionalNullableString,
  // Contractual data
  hireDate: optionalNullableDate,
  contractType: optionalNullableString,
  notes: optionalNullableString,
  allowedHours: z
    .object({
      weekSchedule: z.record(z.array(timeRangeSchema).min(1)).optional(),
      // Manter compatibilidade com estrutura antiga
      timeRanges: z.array(timeRangeSchema).min(1).optional(),
      days: z.array(z.number().min(0).max(6)).optional(),
    })
    .optional()
    .nullable(),
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  // Personal data
  document: optionalNullableString,
  birthDate: optionalNullableDate,
  phone: optionalNullableString,
  whatsapp: optionalNullableString,
  emailAlt: z.preprocess(
    (val) => (val === '' || val === null ? null : val),
    z.string().email('Email alternativo inválido').nullable().optional()
  ),
  address: optionalNullableAddress,
  photoUrl: optionalNullableString,
  // Commercial data
  commissionRate: optionalNullableNumber,
  monthlyTarget: optionalNullableInt,
  region: optionalNullableString,
  // Contractual data
  hireDate: optionalNullableDate,
  contractType: optionalNullableString,
  notes: optionalNullableString,
  allowedHours: z
    .object({
      weekSchedule: z.record(z.array(timeRangeSchema).min(1)).optional(),
      // Manter compatibilidade com estrutura antiga
      timeRanges: z.array(timeRangeSchema).min(1).optional(),
      days: z.array(z.number().min(0).max(6)).optional(),
    })
    .optional()
    .nullable(),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}
