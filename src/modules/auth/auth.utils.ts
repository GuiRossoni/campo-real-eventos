import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../@types/index';
import { ENV } from '../../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

export async function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  if (!plainPassword || !hash) return false;
  // Suporte a texto puro legado durante migração transitória caso ainda não esteja em hash
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
    return plainPassword === hash;
  }
  return bcrypt.compare(plainPassword, hash);
}

export function generateToken(user: { id: string; email: string; role: UserRole; name: string }): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
