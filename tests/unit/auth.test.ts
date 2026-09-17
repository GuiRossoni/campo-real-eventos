import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../../src/modules/auth/auth.utils';

describe('Auth Utilities (Unit Tests)', () => {
  it('should securely hash a plain password using bcrypt', async () => {
    const plain = 'MinhaSenhaSegura123!';
    const hashed = await hashPassword(plain);

    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plain);
    expect(hashed.startsWith('$2a$') || hashed.startsWith('$2b$')).toBe(true);
  });

  it('should correctly compare matching and non-matching passwords', async () => {
    const plain = 'SenhaTeste2026';
    const hashed = await hashPassword(plain);

    const isMatch = await comparePassword(plain, hashed);
    const isWrongMatch = await comparePassword('SenhaErrada', hashed);

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });

  it('should generate a valid JWT token and verify its payload', () => {
    const user = {
      id: 'test_user_1',
      name: 'João da Silva',
      email: 'joao.silva@camporeal.edu.br',
      role: 'PARTICIPANTE' as const
    };

    const token = generateToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.id).toBe(user.id);
    expect(payload?.email).toBe(user.email);
    expect(payload?.role).toBe(user.role);
    expect(payload?.name).toBe(user.name);
  });

  it('should reject tampered or invalid JWT tokens', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';
    const payload = verifyToken(invalidToken);
    expect(payload).toBeNull();
  });
});
