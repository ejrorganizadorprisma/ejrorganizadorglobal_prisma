import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT_SECRET MUST be defined. No fallback. The check in src/config/env.ts
// already enforces this at startup, but we double-check here so this module
// fails fast in any context (tests, scripts) that imports it directly.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET nao configurado. Defina a variavel de ambiente JWT_SECRET com uma chave aleatoria forte (>=32 bytes).'
  );
}

// Access token: short-lived JWT (15 min). Carries the user identity.
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  passwordVersion?: number;
}

const ACCESS_TOKEN_TTL = '15m';
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: ACCESS_TOKEN_TTL as any,
  });
}

/**
 * Refresh token = string opaca aleatoria (NAO e JWT).
 * Retornamos o valor "raw" (que vai pro cliente) e o hash SHA-256 (que vai pro DB).
 * O servidor nunca armazena o raw — somente o hash.
 */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = hashRefreshToken(raw);
  return { raw, hash };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate a CSRF token (opaque random string). Stored in a non-HttpOnly
 * cookie and echoed back in the X-CSRF-Token header (double-submit pattern).
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifica access token. Lanca jwt.TokenExpiredError ou jwt.JsonWebTokenError
 * para o middleware diferenciar "expirou" de "invalido".
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
}

// Backwards-compatible alias used in older code paths (auth.controller register).
// Prefer generateAccessToken in new code.
export function generateToken(payload: JWTPayload, _expiresIn?: string): string {
  return generateAccessToken(payload);
}
