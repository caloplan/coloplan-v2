import { PaginationParams } from './common.js';

export interface MetadataEntry {
  id: number;
  typeName: string;
  entityKey: string;
  data: Record<string, unknown>;
  tags: string[];
  version: number;
  ownerUserId: number;
  serviceName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateEntryParams {
  typeName: string;
  entityKey: string;
  data: Record<string, unknown>;
  tags?: string[];
  /** 类型所属服务名（跨 service 操作时必须显式传入，否则后端按当前用户所属 service 定位） */
  serviceName?: string;
}

export interface UpdateEntryParams {
  data?: Record<string, unknown>;
  tags?: string[];
}

export interface GetEntryOptions {
  version?: number;
}

export interface QueryEntriesParams extends PaginationParams {
  typeName?: string;
  /** 业务名（跨 service 查询需 superuser；不传时 GLOBAL 查全部，普通身份强制自身 service） */
  serviceName?: string;
  filters?: Record<string, unknown>;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
}

export interface BatchQueryEntriesParams {
  /** 类型名（必填） */
  typeName: string;
  /** 待查询的 entity_key 列表（服务端去重；数量上限 200，超限返回 422） */
  keys: string[];
  /** 目标业务名（仅 superuser 可指定其他服务，默认当前用户所属服务） */
  serviceName?: string;
}

/** 批量查询结果：{ entityKey: MetadataEntry | null }；未找到 / 软删 / 无权限的 key 对应 null */
export type BatchQueryEntriesResult = Record<string, MetadataEntry | null>;

export interface MetadataVersion {
  version: number;
  data: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  createdByUserId: number;
}

export interface RollbackParams {
  version: number;
}
