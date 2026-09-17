import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
  validateRA,
  validateCourse,
  validateRecoveryCode
} from '../../src/shared/utils/validators';

describe('Validators (Unit Tests)', () => {
  describe('Email validation', () => {
    it('should accept valid institutional and standard emails', () => {
      expect(validateEmail('aluno@camporeal.edu.br').isValid).toBe(true);
      expect(validateEmail('professor.teste@gmail.com').isValid).toBe(true);
    });

    it('should reject malformed or empty emails', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('emailinvalido').isValid).toBe(false);
      expect(validateEmail('@camporeal.edu.br').isValid).toBe(false);
      expect(validateEmail('aluno@').isValid).toBe(false);
    });
  });

  describe('Password validation', () => {
    it('should require minimum 6 characters for login/creation', () => {
      expect(validatePassword('12345', false).isValid).toBe(false);
      expect(validatePassword('123456', false).isValid).toBe(true);
    });

    it('should compute password strength levels properly', () => {
      const weak = validatePassword('123456', true);
      expect(weak.level).toBe('fraca');

      const strong = validatePassword('CampoReal@2026!', true);
      expect(strong.level).toBe('forte');
    });

    it('should validate matching passwords', () => {
      expect(validatePasswordMatch('Senha123', 'Senha123').isValid).toBe(true);
      expect(validatePasswordMatch('Senha123', 'OutraSenha').isValid).toBe(false);
    });
  });

  describe('Full name and academic fields validation', () => {
    it('should require at least first name and surname', () => {
      expect(validateFullName('João').isValid).toBe(false);
      expect(validateFullName('João Silva').isValid).toBe(true);
    });

    it('should validate RA format (optional, but validates length if provided)', () => {
      expect(validateRA('').isValid).toBe(true); // Opcional
      expect(validateRA('12').isValid).toBe(false); // Muito curto
      expect(validateRA('202410293').isValid).toBe(true);
    });

    it('should validate Course name', () => {
      expect(validateCourse('').isValid).toBe(false);
      expect(validateCourse('Engenharia de Software').isValid).toBe(true);
    });
  });

  describe('Recovery code validation', () => {
    it('should accept valid 6-digit numeric recovery codes', () => {
      expect(validateRecoveryCode('123456').isValid).toBe(true);
      expect(validateRecoveryCode('000000').isValid).toBe(true);
      expect(validateRecoveryCode('999999').isValid).toBe(true);
    });

    it('should reject non-6-digit or non-numeric codes', () => {
      expect(validateRecoveryCode('').isValid).toBe(false);
      expect(validateRecoveryCode('12345').isValid).toBe(false);
      expect(validateRecoveryCode('1234567').isValid).toBe(false);
      expect(validateRecoveryCode('abcdef').isValid).toBe(false);
      expect(validateRecoveryCode('12345a').isValid).toBe(false);
    });
  });
});
