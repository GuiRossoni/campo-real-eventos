/**
 * Validadores padronizados para campos críticos do sistema
 * (Login, Senha, Cadastro, Recuperação e Busca)
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface PasswordStrengthResult extends ValidationResult {
  score: number; // 0 a 4
  level: 'fraca' | 'media' | 'forte';
  label: string;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasLetter: boolean;
  hasSpecial: boolean;
}

export interface SearchValidationResult {
  isValid: boolean;
  sanitized: string;
  error: string | null;
  isTooLong: boolean;
  charCount: number;
}

/**
 * Validação de E-mail
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = (email || '').trim();

  if (!trimmed) {
    return { isValid: false, error: 'O e-mail é obrigatório.' };
  }

  if (trimmed.length > 120) {
    return { isValid: false, error: 'O e-mail não pode ultrapassar 120 caracteres.' };
  }

  // Regex de e-mail RFC 5322 simplificado e seguro
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Informe um endereço de e-mail válido (ex: nome@camporeal.edu.br).' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação e Força de Senha
 */
export function validatePassword(password: string, isCreation: boolean = false): PasswordStrengthResult {
  const val = password || '';

  const hasMinLength = val.length >= 6;
  const hasEightChars = val.length >= 8;
  const hasNumber = /[0-9]/.test(val);
  const hasLetter = /[a-zA-Z]/.test(val);
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasSpecial = /[^A-Za-z0-9]/.test(val);

  let score = 0;
  if (hasMinLength) score++;
  if (hasEightChars && (hasNumber || hasSpecial)) score++;
  if (hasUpper && hasLower) score++;
  if (hasSpecial && hasNumber) score++;

  let level: 'fraca' | 'media' | 'forte' = 'fraca';
  let label = 'Fraca';

  if (score >= 3) {
    level = 'forte';
    label = 'Forte';
  } else if (score >= 2) {
    level = 'media';
    label = 'Média';
  }

  if (!val) {
    return {
      isValid: false,
      error: 'A senha é obrigatória.',
      score: 0,
      level: 'fraca',
      label: 'Fraca',
      hasMinLength: false,
      hasNumber: false,
      hasLetter: false,
      hasSpecial: false
    };
  }

  if (val.length < 6) {
    return {
      isValid: false,
      error: 'A senha deve conter no mínimo 6 caracteres.',
      score,
      level,
      label,
      hasMinLength,
      hasNumber,
      hasLetter,
      hasSpecial
    };
  }

  if (val.length > 64) {
    return {
      isValid: false,
      error: 'A senha não pode ultrapassar 64 caracteres.',
      score,
      level,
      label,
      hasMinLength,
      hasNumber,
      hasLetter,
      hasSpecial
    };
  }

  // Se for criação/redefinição, encorajar combinação de letras e números se for muito simples
  if (isCreation && !hasNumber && !hasLetter) {
    return {
      isValid: false,
      error: 'A senha deve conter pelo menos uma letra ou número.',
      score,
      level,
      label,
      hasMinLength,
      hasNumber,
      hasLetter,
      hasSpecial
    };
  }

  return {
    isValid: true,
    error: null,
    score,
    level,
    label,
    hasMinLength,
    hasNumber,
    hasLetter,
    hasSpecial
  };
}

/**
 * Validação de Confirmação de Senha
 */
export function validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: 'A confirmação de senha é obrigatória.' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'As senhas não coincidem.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Nome Completo
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { isValid: false, error: 'O nome completo é obrigatório.' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'O nome deve ter no mínimo 3 caracteres.' };
  }

  if (trimmed.length > 80) {
    return { isValid: false, error: 'O nome não pode exceder 80 caracteres.' };
  }

  // Verifica se possui caracteres proibidos (ex: dígitos ou símbolos excessivos)
  const validNameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
  if (!validNameRegex.test(trimmed)) {
    return { isValid: false, error: 'O nome deve conter apenas letras e espaços.' };
  }

  // Recomenda nome e sobrenome
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { isValid: false, error: 'Por favor, informe seu nome e sobrenome completos.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Registro Acadêmico (RA)
 */
export function validateRA(ra: string): ValidationResult {
  const trimmed = (ra || '').trim();

  // RA é opcional
  if (!trimmed) {
    return { isValid: true, error: null };
  }

  if (trimmed.length < 4 || trimmed.length > 15) {
    return { isValid: false, error: 'O RA deve conter entre 4 e 15 caracteres alfanuméricos.' };
  }

  const raRegex = /^[a-zA-Z0-9]+$/;
  if (!raRegex.test(trimmed)) {
    return { isValid: false, error: 'O RA deve conter apenas números e letras (sem caracteres especiais).' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Curso
 */
export function validateCourse(course: string, isRequired: boolean = true): ValidationResult {
  const trimmed = (course || '').trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: 'O curso de graduação é obrigatório.' };
    }
    return { isValid: true, error: null };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'O nome do curso deve conter no mínimo 3 caracteres.' };
  }

  if (trimmed.length > 80) {
    return { isValid: false, error: 'O nome do curso não pode exceder 80 caracteres.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Instituição
 */
export function validateInstitution(institution: string): ValidationResult {
  const trimmed = (institution || '').trim();

  // Instituição é opcional
  if (!trimmed) {
    return { isValid: true, error: null };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'O nome da instituição não pode exceder 100 caracteres.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Período / Ano
 */
export function validatePeriod(period: string): ValidationResult {
  const trimmed = (period || '').trim();

  // Período é opcional
  if (!trimmed) {
    return { isValid: true, error: null };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'O período não pode exceder 50 caracteres.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Código de Recuperação de Senha (6 dígitos)
 */
export function validateRecoveryCode(code: string): ValidationResult {
  const trimmed = (code || '').trim();

  if (!trimmed) {
    return { isValid: false, error: 'Informe o código de verificação recebido por e-mail.' };
  }

  if (!/^\d{6}$/.test(trimmed)) {
    return { isValid: false, error: 'O código de verificação deve ter exatamente 6 dígitos numéricos.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validador e Sanitizador de Termos de Busca
 */
export function validateSearchQuery(query: string, maxLength: number = 60): SearchValidationResult {
  const raw = query || '';
  
  // Sanitização básica: remove tags HTML e caracteres de controle
  const sanitized = raw
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '');

  const trimmed = sanitized.trim();
  const isTooLong = trimmed.length > maxLength;

  let error: string | null = null;
  if (isTooLong) {
    error = `O termo de busca não deve ultrapassar ${maxLength} caracteres.`;
  }

  return {
    isValid: !isTooLong,
    sanitized: isTooLong ? trimmed.slice(0, maxLength) : trimmed,
    error,
    isTooLong,
    charCount: trimmed.length
  };
}
