import { User } from '../../@types/index';
import { usersService } from '../users/users.service';
import { comparePassword, generateToken, hashPassword } from './auth.utils';

export interface PendingRecovery {
  code: string;
  expiresAt: number;
}

// Armazenamento no lado do servidor para códigos de verificação pendentes (não exposto ao frontend)
export const recoveryStore = new Map<string, PendingRecovery>();

export class AuthService {
  async login(email: string, password?: string): Promise<{ user: User; token: string }> {
    if (!email) {
      throw new Error('O e-mail é obrigatório para acessar a conta.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersService.getUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    // Se o usuário possuir uma senha configurada, realiza a verificação
    if (user.password) {
      if (!password) {
        throw new Error('Informe sua senha de acesso.');
      }
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        throw new Error('E-mail ou senha incorretos.');
      }
    }

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    return {
      user: safeUser as User,
      token
    };
  }

  async register(data: Partial<User>): Promise<{ user: User; token: string }> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nome completo é obrigatório.');
    }

    if (!data.email || !data.email.trim()) {
      throw new Error('E-mail é obrigatório.');
    }

    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await usersService.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('Este endereço de e-mail já está cadastrado no sistema.');
    }

    if (!data.password || data.password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    const userId = data.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hashedPassword = await hashPassword(data.password);

    const newUser: User = {
      id: userId,
      name: data.name.trim(),
      email: normalizedEmail,
      ra: data.ra?.trim() || undefined,
      course: data.course?.trim() || undefined,
      period: data.period?.trim() || undefined,
      institution: data.institution?.trim() || 'Centro Universitário Campo Real',
      role: data.role || 'PARTICIPANTE',
      password: hashedPassword
    };

    const savedUser = await usersService.registerUser(newUser);
    const token = generateToken(savedUser);

    return {
      user: savedUser,
      token
    };
  }

  async getMe(userId: string): Promise<User> {
    const user = await usersService.getUserById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  }

  async verifyAndResetPassword(email: string, code: string, newPassword: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const pending = recoveryStore.get(normalizedEmail);

    if (!pending || Date.now() > pending.expiresAt) {
      throw new Error('Código de verificação expirado ou inválido. Solicite um novo código.');
    }

    if (pending.code !== code.trim()) {
      throw new Error('Código de verificação incorreto. Verifique o código enviado no seu e-mail.');
    }

    const targetUser = await usersService.getUserByEmail(normalizedEmail);
    if (!targetUser) {
      throw new Error('Usuário não localizado no sistema.');
    }

    const hashedPassword = await hashPassword(newPassword);
    const updatedUser = await usersService.updateUser(targetUser.id, { password: hashedPassword });
    recoveryStore.delete(normalizedEmail);

    return updatedUser;
  }
}

export const authService = new AuthService();
