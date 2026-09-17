import { User } from '../../@types/index';
import { isUsingMySQL, mysqlPool, fallbackDb, saveFallbackDb } from '../../config/database';
import { hashPassword } from '../auth/auth.utils';

export function sanitizeUser(user: any): User {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    ra: safeUser.ra || undefined,
    course: safeUser.course || undefined,
    period: safeUser.period || undefined,
    institution: safeUser.institution || undefined
  };
}

const ALLOWED_USER_UPDATE_FIELDS = [
  'name',
  'email',
  'ra',
  'course',
  'period',
  'institution',
  'role',
  'password'
];

export class UsersRepository {
  async registerUser(user: User): Promise<User> {
    const normalizedEmail = user.email.toLowerCase().trim();
    
    // Garante que a senha receba hash com segurança caso fornecida
    let hashedPassword = user.password;
    if (hashedPassword && !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      hashedPassword = await hashPassword(hashedPassword);
    }

    const newUser: User = {
      ...user,
      email: normalizedEmail,
      password: hashedPassword
    };

    if (isUsingMySQL && mysqlPool) {
      try {
        await mysqlPool.query(
          'INSERT INTO users (id, name, email, ra, course, period, institution, role, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newUser.id,
            newUser.name,
            newUser.email,
            newUser.ra || null,
            newUser.course || null,
            newUser.period || null,
            newUser.institution || null,
            newUser.role,
            newUser.password || null
          ]
        );
        return sanitizeUser(newUser);
      } catch (e: any) {
        throw new Error(`Erro ao cadastrar usuário no MySQL: ${e.message}`);
      }
    }

    // Verifica se usuário com o mesmo e-mail já existe no fallbackDb
    const exists = fallbackDb.users.some(u => u.email.toLowerCase().trim() === normalizedEmail);
    if (exists) {
      throw new Error('Este endereço de e-mail já está cadastrado no sistema.');
    }

    fallbackDb.users.push(newUser);
    saveFallbackDb();
    return sanitizeUser(newUser);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    if (isUsingMySQL && mysqlPool) {
      try {
        const [rows]: any = await mysqlPool.query('SELECT * FROM users WHERE LOWER(email) = ?', [normalized]);
        if (rows && rows.length > 0) {
          return rows[0];
        }
        return null;
      } catch {
        // Fallback em memória caso ocorra erro no MySQL
      }
    }
    const found = fallbackDb.users.find(u => u.email.toLowerCase().trim() === normalized);
    return found || null;
  }

  async getUserById(id: string): Promise<User | null> {
    if (isUsingMySQL && mysqlPool) {
      try {
        const [rows]: any = await mysqlPool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          return rows[0];
        }
        return null;
      } catch {
        // Fallback em memória caso ocorra erro no MySQL
      }
    }
    const found = fallbackDb.users.find(u => u.id === id);
    return found || null;
  }

  async updateUser(id: string, updatedFields: Partial<User>): Promise<User> {
    // Se a senha estiver sendo atualizada, aplica o hash primeiro
    const fieldsToUpdate: any = { ...updatedFields };
    if (fieldsToUpdate.password && !fieldsToUpdate.password.startsWith('$2a$') && !fieldsToUpdate.password.startsWith('$2b$')) {
      fieldsToUpdate.password = await hashPassword(fieldsToUpdate.password);
    }

    if (fieldsToUpdate.email) {
      fieldsToUpdate.email = fieldsToUpdate.email.toLowerCase().trim();
      const existing = await this.getUserByEmail(fieldsToUpdate.email);
      if (existing && existing.id !== id) {
        throw new Error('Este endereço de e-mail já está sendo utilizado por outro usuário.');
      }
    }

    // Filtra os campos com lista restrita para prevenir injeção de SQL e atualizações não autorizadas
    const safeKeys = Object.keys(fieldsToUpdate).filter(
      k => ALLOWED_USER_UPDATE_FIELDS.includes(k) && k !== 'id'
    );

    if (safeKeys.length === 0) {
      const existing = await this.getUserById(id);
      if (!existing) throw new Error('Usuário não encontrado');
      return sanitizeUser(existing);
    }

    if (isUsingMySQL && mysqlPool) {
      try {
        const queryStr = `UPDATE users SET ${safeKeys.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ?`;
        const values = safeKeys.map(k => fieldsToUpdate[k]).concat(id);
        await mysqlPool.query(queryStr, values);
        
        const [rows]: any = await mysqlPool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Usuário não encontrado');
        return sanitizeUser(rows[0]);
      } catch (e: any) {
        throw new Error(`Erro ao atualizar usuário no MySQL: ${e.message}`);
      }
    }

    const idx = fallbackDb.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      fallbackDb.users[idx] = { ...fallbackDb.users[idx], ...fieldsToUpdate };
      saveFallbackDb();
      return sanitizeUser(fallbackDb.users[idx]);
    }
    throw new Error('Usuário não encontrado');
  }

  async getUsers(): Promise<User[]> {
    if (isUsingMySQL && mysqlPool) {
      try {
        // Omite explicitamente a coluna de senha nas consultas para rotas de listagem
        const [rows]: any = await mysqlPool.query(
          'SELECT id, name, email, ra, course, period, institution, role FROM users'
        );
        return rows.map(sanitizeUser);
      } catch {
        return fallbackDb.users.map(sanitizeUser);
      }
    }
    return fallbackDb.users.map(sanitizeUser);
  }

  async deleteUser(id: string): Promise<void> {
    if (isUsingMySQL && mysqlPool) {
      try {
        await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
        return;
      } catch (e: any) {
        throw new Error(`Erro ao excluir usuário no MySQL: ${e.message}`);
      }
    }
    fallbackDb.users = fallbackDb.users.filter(u => u.id !== id);
    saveFallbackDb();
  }
}

export const usersRepository = new UsersRepository();
