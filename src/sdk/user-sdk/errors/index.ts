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
  switch (status) {
    case 401:
    case 403:
      return new AuthError(typeof data === 'object' && data && 'detail' in data ? String((data as Record<string, unknown>).detail) : 'Authentication failed', opts);
    case 404:
      return new NotFoundError('Resource not found', opts);
    case 409:
      return new ConflictError('Resource conflict', opts);
    case 422: {
      const fields = extractValidationFields(data);
      return new ValidationError('Validation failed', { ...opts, fields });
    }
    default:
      return new HttpError(`HTTP ${status}`, opts);
  }
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
