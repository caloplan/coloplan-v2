import { PaginationParams } from './common.js';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  serviceName: string;
  role: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateUserParams {
  fullName?: string;
  serviceName?: string;
}

export interface ListUsersParams extends PaginationParams {
  serviceName?: string;
}
