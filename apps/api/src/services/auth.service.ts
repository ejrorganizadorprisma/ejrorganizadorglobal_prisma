import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { UnauthorizedError, ConflictError } from '../utils/errors';
import type { LoginDTO, CreateUserDTO, AuthResponse } from '@ejr/shared-types';

export class AuthService {
  async login(data: LoginDTO, isMobile: boolean = false): Promise<AuthResponse> {
    const { email, password } = data;

    // Busca usuário (incluindo password_version para validação de sessão)
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    const user = result.rows[0];

    // Verifica senha usando bcrypt
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    // Verifica se está ativo
    if (!user.is_active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    // Gera token (mobile recebe token de 30 dias para suportar uso offline)
    const token = generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      isMobile ? '30d' : '24h'
    );

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
    const existingResult = await db.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingResult.rowCount > 0) {
      throw new ConflictError('Email já cadastrado');
    }

    // Cria o hash da senha usando bcrypt
    const passwordHash = await hashPassword(password);

    // Gera um UUID para o novo usuário
    const userId = randomUUID();

    // Cria usuário
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, name, role, allowed_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, email, passwordHash, name, role, allowedHours || null, true]
    );

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar usuário');
    }

    const user = result.rows[0];

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
    const result = await db.query(
      'SELECT id, email, name, role, is_active, allowed_hours, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const user = result.rows[0];

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
