import { supabase } from '../config/supabase';
import { hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import type { LoginDTO, CreateUserDTO, AuthResponse } from '@ejr/shared-types';

export class AuthService {
  async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, password } = data;

    // Busca usuário
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    const user = users[0];

    // Verifica senha usando a função crypt do PostgreSQL (DESABILITADO)
    // const { data: passwordCheckResult } = await supabase.rpc('verify_password', {
    //   p_email: email,
    //   p_password: password,
    // });

    // if (!passwordCheckResult) {
    //   throw new UnauthorizedError('Email ou senha inválidos');
    // }

    // Verifica se está ativo
    if (!user.is_active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    // Gera token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password_hash da resposta e converte snake_case para camelCase
    const { password_hash, is_active, allowed_hours, created_at, updated_at, ...userData } = user;
    const userWithoutPassword = {
      ...userData,
      isActive: is_active,
      allowedHours: allowed_hours,
      createdAt: created_at,
      updatedAt: updated_at,
    };

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async register(data: CreateUserDTO): Promise<AuthResponse> {
    const { email, password, name, role, allowedHours } = data;

    // Verifica se email já existe
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      throw new ConflictError('Email já cadastrado');
    }

    // Cria o hash da senha usando RPC (chama crypt do PostgreSQL)
    const { data: hashedPassword } = await supabase.rpc('hash_password', {
      p_password: password,
    });

    // Cria usuário
    const { data: newUsers, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        name,
        role,
        allowed_hours: allowedHours || null,
        is_active: true,
      })
      .select('*');

    if (error || !newUsers || newUsers.length === 0) {
      throw new Error('Erro ao criar usuário');
    }

    const user = newUsers[0];

    // Gera token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password_hash da resposta e converte snake_case para camelCase
    const { password_hash, is_active, allowed_hours, created_at, updated_at, ...userData } = user;
    const userWithoutPassword = {
      ...userData,
      isActive: is_active,
      allowedHours: allowed_hours,
      createdAt: created_at,
      updatedAt: updated_at,
    };

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, allowed_hours, created_at, updated_at')
      .eq('id', userId)
      .limit(1);

    if (error || !users || users.length === 0) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const user = users[0];

    // Converte snake_case para camelCase
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      allowedHours: user.allowed_hours,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
