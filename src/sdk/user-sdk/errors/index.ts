export { SdkError } from './base-error.js';
export { AuthError } from './auth-error.js';
export { ValidationError } from './validation-error.js';
export { NotFoundError } from './not-found-error.js';
export { ConflictError } from './conflict-error.js';
export { HttpError } from './http-error.js';
export { NetworkError } from './network-error.js';

import { SdkError } from './base-error.js';
import { AuthError } from './auth-error.js';
import { ValidationError } from './validation-error.js';
import { NotFoundError } from './not-found-error.js';
import { ConflictError } from './conflict-error.js';
import { HttpError } from './http-error.js';

export function mapHttpError(status: number, data: unknown, cause?: Error): SdkError {
  const opts = { statusCode: status, response: data, cause };
  const detail = detailText(data);
  switch (status) {
    case 401:
    case 403:
      return new AuthError(detail ?? 'Authentication failed', opts);
    case 404:
      return new NotFoundError(detail ?? 'Resource not found', opts);
    case 409:
      return new ConflictError(detail ?? 'Resource conflict', opts);
    case 422: {
      const fields = extractValidationFields(data);
      // 422 的 detail 是 [{loc,msg}] 数组，直接把中文 msg 拼成 message
      return new ValidationError(detail ?? 'Validation failed', { ...opts, fields });
    }
    default:
      return new HttpError(detail ?? `HTTP ${status}`, opts);
  }
}

/**
 * 从 FastAPI 错误响应体提取可读文案：
 * - detail 为字符串（HTTPException 业务错误）→ 直接用；
 * - detail 为数组（Pydantic 422 校验错误）→ 拼接各项 msg。
 */
function detailText(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const detail = (data as Record<string, unknown>).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .filter((it) => it && typeof it === 'object' && 'msg' in it)
      .map((it) => String((it as Record<string, unknown>).msg));
    const joined = msgs.filter(Boolean).join('；');
    if (joined) return joined;
  }
  return undefined;
}

function extractValidationFields(data: unknown): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const detail = (data as Record<string, unknown>).detail;
  if (!Array.isArray(detail)) return undefined;
  const fields: Record<string, string[]> = {};
  for (const item of detail) {
    if (item && typeof item === 'object' && 'loc' in item && 'msg' in item) {
      const loc = (item as Record<string, unknown>).loc;
      const msg = String((item as Record<string, unknown>).msg);
      if (Array.isArray(loc) && loc.length > 0) {
        const field = String(loc[loc.length - 1]);
        if (!fields[field]) fields[field] = [];
        fields[field].push(msg);
      }
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}
