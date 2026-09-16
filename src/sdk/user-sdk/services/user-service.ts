import { HttpClient } from '../http/http-client.js';
import { UserInfo, UpdateUserParams, ListUsersParams } from '../types/user.js';
import { PaginatedResponse, PaginationParams } from '../types/common.js';
import { ChangePasswordParams } from '../types/auth.js';
import { camelToSnake, snakeToCamel } from '../utils/case-convert.js';

function toSkipLimit(params?: PaginationParams): { skip?: number; limit?: number } {
  if (!params?.page && !params?.pageSize) return {};
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

export class UserService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async getMe(): Promise<UserInfo> {
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'GET',
      url: '/api/v1/users/me',
    });
    return snakeToCamel<UserInfo>(resp.data);
  }

  async updateMe(params: UpdateUserParams): Promise<UserInfo> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'PUT',
      url: '/api/v1/users/me',
      data: body,
    });
    return snakeToCamel<UserInfo>(resp.data);
  }

  async changePassword(params: ChangePasswordParams): Promise<void> {
    const body = camelToSnake<Record<string, unknown>>(params);
    await this.http.request({
      method: 'POST',
      url: '/api/v1/users/me/change-password',
      data: body,
    });
  }

  async deleteMe(): Promise<void> {
    await this.http.request({
      method: 'DELETE',
      url: '/api/v1/users/me',
    });
  }

  async getById(id: number): Promise<UserInfo> {
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'GET',
      url: `/api/v1/users/${id}`,
    });
    return snakeToCamel<UserInfo>(resp.data);
  }

  async list(params?: ListUsersParams): Promise<PaginatedResponse<UserInfo>> {
    const query: Record<string, unknown> = { ...toSkipLimit(params) };
    if (params?.serviceName) query.service_name = params.serviceName;
    const resp = await this.http.request<{ total: number; items: Record<string, unknown>[] }>({
      method: 'GET',
      url: '/api/v1/users',
      params: query,
    });
    return {
      total: resp.data.total,
      items: resp.data.items.map((item) => snakeToCamel<UserInfo>(item)),
    };
  }
}
