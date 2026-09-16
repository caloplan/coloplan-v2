import { HttpClient } from '../http/http-client.js';
import {
  MetadataEntry,
  CreateEntryParams,
  UpdateEntryParams,
  GetEntryOptions,
  QueryEntriesParams,
  BatchQueryEntriesParams,
  BatchQueryEntriesResult,
  MetadataVersion,
  RollbackParams,
} from '../types/entry.js';
import { PaginatedResponse, PaginationParams } from '../types/common.js';
import { camelToSnake, snakeToCamel } from '../utils/case-convert.js';
import { mapHttpError } from '../errors/index.js';

export class EntryService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(params: CreateEntryParams): Promise<MetadataEntry> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/entries',
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataEntry>(resp.data);
  }

  async get(typeName: string, entityKey: string, options?: GetEntryOptions): Promise<MetadataEntry> {
    const params: Record<string, unknown> = {};
    if (options?.version !== undefined) params.version = options.version;
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'GET',
      url: `/api/v1/entries/${typeName}/${entityKey}`,
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataEntry>(resp.data);
  }

  async batchGet(params: BatchQueryEntriesParams): Promise<BatchQueryEntriesResult> {
    // 后端 POST /api/v1/entries/batch：请求体 {type_name, keys[], service_name?}，返回 {key: obj|null}
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/entries/batch',
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    // 仅转换实体对象，保留顶层 key 原样（entity_key 可能含下划线，不能对整个 map 递归转换）
    const result: BatchQueryEntriesResult = {};
    for (const [key, value] of Object.entries(resp.data)) {
      result[key] =
        value === null || value === undefined ? null : snakeToCamel<MetadataEntry>(value);
    }
    return result;
  }

  async update(typeName: string, entityKey: string, params: UpdateEntryParams): Promise<MetadataEntry> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'PUT',
      url: `/api/v1/entries/${typeName}/${entityKey}`,
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataEntry>(resp.data);
  }

  async delete(typeName: string, entityKey: string): Promise<void> {
    const resp = await this.http.request({
      method: 'DELETE',
      url: `/api/v1/entries/${typeName}/${entityKey}`,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
  }

  async query(params: QueryEntriesParams): Promise<PaginatedResponse<MetadataEntry>> {
    // 后端 /api/v1/entries 分页契约使用 page / page_size（不能传 skip/limit，否则会被当作字段过滤器）
    const query: Record<string, unknown> = {};

    if (params.page) query.page = params.page;
    if (params.pageSize) query.page_size = params.pageSize;
    if (params.typeName) query.type_name = params.typeName;
    if (params.serviceName) query.service_name = params.serviceName;
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        query[key] = value;
      }
    }
    if (params.tags && params.tags.length > 0) {
      query.tags = params.tags.join(',');
    }
    if (params.sortBy) query.sort_by = params.sortBy;
    if (params.sortOrder) query.sort_order = params.sortOrder;
    if (params.createdAfter) query.created_after = params.createdAfter;
    if (params.createdBefore) query.created_before = params.createdBefore;

    const resp = await this.http.request<{ total: number; items: Record<string, unknown>[] }>({
      method: 'GET',
      url: '/api/v1/entries',
      params: query,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return {
      total: resp.data.total,
      items: resp.data.items.map((item) => snakeToCamel<MetadataEntry>(item)),
    };
  }

  async listVersions(
    typeName: string,
    entityKey: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<MetadataVersion>> {
    // 后端 /api/v1/entries/{type}/{key}/versions 分页契约使用 page / page_size
    const query: Record<string, unknown> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    const resp = await this.http.request<{ total: number; items: Record<string, unknown>[] }>({
      method: 'GET',
      url: `/api/v1/entries/${typeName}/${entityKey}/versions`,
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return {
      total: resp.data.total,
      items: resp.data.items.map((item) => snakeToCamel<MetadataVersion>(item)),
    };
  }

  async rollback(typeName: string, entityKey: string, params: RollbackParams): Promise<MetadataEntry> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: `/api/v1/entries/${typeName}/${entityKey}/rollback`,
      data: body,
    });
    if (resp.status >= 400) throw mapHttpError(resp.status, resp.data);
    return snakeToCamel<MetadataEntry>(resp.data);
  }
}
