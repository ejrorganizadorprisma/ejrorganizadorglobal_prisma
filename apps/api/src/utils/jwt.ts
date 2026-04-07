import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  passwordVersion?: number; // Optional para compatibilidade
}

export function generateToken(payload: JWTPayload, expiresIn: string = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn as any,
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
}
