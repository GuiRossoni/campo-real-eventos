import { User } from '../../@types/index';
import { usersRepository } from './users.repository';

export class UsersService {
  async registerUser(user: User): Promise<User> {
    return usersRepository.registerUser(user);
  }

  async updateUser(id: string, updatedFields: Partial<User>): Promise<User> {
    return usersRepository.updateUser(id, updatedFields);
  }

  async getAllUsers(): Promise<User[]> {
    return usersRepository.getUsers();
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return usersRepository.getUserByEmail(email);
  }

  async getUserById(id: string): Promise<User | null> {
    return usersRepository.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    return usersRepository.deleteUser(id);
  }
}

export const usersService = new UsersService();
