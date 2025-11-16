import { z } from 'zod';

export enum UserRole {
  OWNER = 'OWNER',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  SALESPERSON = 'SALESPERSON',
  STOCK = 'STOCK',
  TECHNICIAN = 'TECHNICIAN',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  allowedHours?: {
    start: string; // "08:00"
    end: string; // "18:00"
  };
  createdAt: Date;
  updatedAt: Date;
}

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.nativeEnum(UserRole),
  allowedHours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
      end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
    })
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  allowedHours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
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
