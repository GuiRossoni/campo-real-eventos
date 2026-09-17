import { User } from '../../@types/index';

export interface Credentials {
  email: string;
  password?: string;
}

export interface RegisterInput {
  user: User;
}
