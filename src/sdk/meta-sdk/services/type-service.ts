import { HttpClient } from '../http/http-client.js';
import { MetadataType, CreateTypeParams, UpdateTypeParams } from '../types/type.js';
import { PaginatedResponse, PaginationParams } from '../types/common.js';
import { camelToSnake, snakeToCamel } from '../utils/case-convert.js';
import { mapHttpError } from '../errors/index.js';

function toSkipLimit(params?: PaginationParams): { skip?: number; limit?: number } {
  if (!params?.page && !params?.pageSize) return {};
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

export class TypeService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(params: CreateTypeParams): Promise<MetadataType> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/types',
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataType>(resp.data);
  }

  async list(params?: { serviceName?: string } & PaginationParams): Promise<PaginatedResponse<MetadataType>> {
    const query: Record<string, unknown> = { ...toSkipLimit(params) };
    if (params?.serviceName) query.service_name = params.serviceName;
    const resp = await this.http.request<{ total: number; items: Record<string, unknown>[] }>({
      method: 'GET',
      url: '/api/v1/types',
      params: query,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return {
      total: resp.data.total,
      items: resp.data.items.map((item) => snakeToCamel<MetadataType>(item)),
    };
  }

  async get(typeName: string, serviceName?: string): Promise<MetadataType> {
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'GET',
      url: `/api/v1/types/${typeName}`,
      params: serviceName ? { service_name: serviceName } : undefined,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataType>(resp.data);
  }

  async update(typeName: string, serviceName: string, params: UpdateTypeParams): Promise<MetadataType> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'PUT',
      url: `/api/v1/types/${typeName}`,
      params: serviceName ? { service_name: serviceName } : undefined,
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataType>(resp.data);
  }

  async delete(typeName: string, serviceName?: string): Promise<void> {
    const resp = await this.http.request({
      method: 'DELETE',
      url: `/api/v1/types/${typeName}`,
      params: serviceName ? { service_name: serviceName } : undefined,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
  }
}
