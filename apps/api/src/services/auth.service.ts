import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { db } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from '../utils/jwt';
import { AppError, UnauthorizedError, ConflictError } from '../utils/errors';
import type { LoginDTO, CreateUserDTO, AuthResponse } from '@ejr/shared-types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface LoginResult extends AuthResponse {
  user: AuthResponse['user'];
  token: string; // alias of accessToken (back-compat)
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

function clientMeta(req?: Request) {
  return {
    userAgent: (req?.headers['user-agent'] as string) || null,
    ip: (req?.ip as string) || (req?.socket?.remoteAddress as string) || null,
  };
}

async function persistRefreshToken(
  userId: string,
  rawRefresh: string,
  hash: string,
  req: Request | undefined,
  rotatedFromId?: string | null
): Promise<{ id: string; expiresAt: Date }> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const { userAgent, ip } = clientMeta(req);

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, hash, expiresAt, userAgent, ip]
  );

  if (rotatedFromId) {
    await db.query(
      `UPDATE refresh_tokens SET rotated_to = $1 WHERE id = $2`,
      [id, rotatedFromId]
    );
  }

  return { id, expiresAt };
}

export class AuthService {
  /**
   * Autentica usuario e gera par access+refresh.
   * O refresh e salvado HASHED no banco (SHA-256). Retornamos a string raw
   * para o controller decidir como entregar (cookie web vs body mobile).
   */
  async login(
    data: LoginDTO,
    isMobile: boolean = false,
    req?: Request
  ): Promise<LoginResult> {
    const { email, password } = data;

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    const user = result.rows[0];

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email ou senha inválidos');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    // Gera par access (15m) + refresh (7d) — TTL e o mesmo para web e mobile.
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const { raw: refreshToken, hash: refreshHash } = generateRefreshToken();
    const { expiresAt: refreshExpiresAt } = await persistRefreshToken(
      user.id,
      refreshToken,
      refreshHash,
      req,
      null
    );

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
      token: accessToken,
      accessToken,
      refreshToken,
      refreshExpiresAt,
    };
  }

  /**
   * Rotaciona refresh token. Valida o hash, revoga o token atual,
   * gera novo par access+refresh apontando rotated_to.
   * Lanca UnauthorizedError se token nao existir, expirou ou ja foi revogado.
   * Em caso de tentativa de reuso (token revogado), revogamos toda a cadeia
   * do usuario (defense-in-depth contra refresh token theft).
   */
  async refresh(
    rawRefresh: string | undefined | null,
    req?: Request
  ): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date; user: { id: string; email: string; role: string } }> {
    if (!rawRefresh || typeof rawRefresh !== 'string') {
      throw new UnauthorizedError('Refresh token ausente');
    }

    const hash = hashRefreshToken(rawRefresh);
    const result = await db.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, rt.rotated_to,
              u.email, u.role, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        LIMIT 1`,
      [hash]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    const row = result.rows[0];

    // Reuse detection: token ja revogado/rotacionado => provavelmente vazou.
    // EXCECAO (janela de graca): duas abas do mesmo browser podem disparar
    // refresh simultaneo com o mesmo cookie — a primeira rotaciona, a segunda
    // chega aqui com o token recem-rotacionado. Isso NAO e roubo de token.
    // Se a rotacao aconteceu ha menos de 60s, respondemos 401 REFRESH_RACE
    // sem revogar nada: o cookie novo (setado pela aba vencedora) ja esta no
    // browser e o front apenas re-tenta a request original.
    if (row.revoked_at || row.rotated_to) {
      const revokedAgoMs = row.revoked_at
        ? Date.now() - new Date(row.revoked_at).getTime()
        : Number.POSITIVE_INFINITY;

      if (row.rotated_to && revokedAgoMs < 60_000) {
        throw new AppError(
          'Refresh concorrente — use o token mais novo',
          401,
          'REFRESH_RACE'
        );
      }

      // Reuso fora da janela de graca: revoga toda a familia desse usuario
      // para forcar re-login em todos clients (defense-in-depth).
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [row.user_id]
      );
      throw new UnauthorizedError('Refresh token reutilizado — sessoes revogadas');
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedError('Refresh token expirado');
    }

    if (!row.is_active) {
      throw new UnauthorizedError('Usuário inativo');
    }

    // Revoga o atual e gera novo par.
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [row.id]
    );

    const accessToken = generateAccessToken({
      userId: row.user_id,
      email: row.email,
      role: row.role,
    });
    const { raw: newRefresh, hash: newHash } = generateRefreshToken();
    const { expiresAt } = await persistRefreshToken(
      row.user_id,
      newRefresh,
      newHash,
      req,
      row.id
    );

    return {
      accessToken,
      refreshToken: newRefresh,
      refreshExpiresAt: expiresAt,
      user: {
        id: row.user_id,
        email: row.email,
        role: row.role,
      },
    };
  }

  /**
   * Revoga refresh token (logout). Idempotente: se nao achar, retorna sem erro.
   */
  async logout(rawRefresh?: string | null): Promise<void> {
    if (!rawRefresh) return;
    const hash = hashRefreshToken(rawRefresh);
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
        WHERE token_hash = $1 AND revoked_at IS NULL`,
      [hash]
    );
  }

  async register(data: CreateUserDTO): Promise<AuthResponse> {
    const {
      email,
      password,
      name,
      role,
      allowedHours,
      document,
      birthDate,
      phone,
      whatsapp,
      emailAlt,
      address,
      photoUrl,
      commissionRate,
      monthlyTarget,
      region,
      hireDate,
      contractType,
      notes,
    } = data;

    const existingResult = await db.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingResult.rowCount > 0) {
      throw new ConflictError('Email já cadastrado');
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();

    const result = await db.query(
      `INSERT INTO users (
        id, email, password_hash, name, role, allowed_hours, is_active,
        document, birth_date, phone, whatsapp, email_alt, address, photo_url,
        commission_rate, monthly_target, region,
        hire_date, contract_type, notes
      )
       VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20
       )
       RETURNING *`,
      [
        userId,
        email,
        passwordHash,
        name,
        role,
        allowedHours || null,
        true,
        document ?? null,
        birthDate ?? null,
        phone ?? null,
        whatsapp ?? null,
        emailAlt ?? null,
        address ?? null,
        photoUrl ?? null,
        commissionRate ?? null,
        monthlyTarget ?? null,
        region ?? null,
        hireDate ?? null,
        contractType ?? null,
        notes ?? null,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('Erro ao criar usuário');
    }

    const user = result.rows[0];

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const {
      password_hash,
      is_active,
      allowed_hours,
      created_at,
      updated_at,
      birth_date,
      email_alt,
      photo_url,
      commission_rate,
      monthly_target,
      hire_date,
      contract_type,
      ...userData
    } = user;
    const userWithoutPassword = {
      ...userData,
      isActive: is_active,
      allowedHours: allowed_hours,
      birthDate: birth_date ?? null,
      emailAlt: email_alt ?? null,
      photoUrl: photo_url ?? null,
      commissionRate:
        commission_rate !== null && commission_rate !== undefined
          ? Number(commission_rate)
          : null,
      monthlyTarget: monthly_target ?? null,
      hireDate: hire_date ?? null,
      contractType: contract_type ?? null,
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
      `SELECT id, email, name, role, is_active, allowed_hours,
              document, birth_date, phone, whatsapp, email_alt, address, photo_url,
              commission_rate, monthly_target, region,
              hire_date, contract_type, notes,
              created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const user = result.rows[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      allowedHours: user.allowed_hours,
      document: user.document ?? null,
      birthDate: user.birth_date ?? null,
      phone: user.phone ?? null,
      whatsapp: user.whatsapp ?? null,
      emailAlt: user.email_alt ?? null,
      address: user.address ?? null,
      photoUrl: user.photo_url ?? null,
      commissionRate:
        user.commission_rate !== null && user.commission_rate !== undefined
          ? Number(user.commission_rate)
          : null,
      monthlyTarget: user.monthly_target ?? null,
      region: user.region ?? null,
      hireDate: user.hire_date ?? null,
      contractType: user.contract_type ?? null,
      notes: user.notes ?? null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
