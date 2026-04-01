import { z } from 'zod';

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

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.nativeEnum(UserRole),
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
