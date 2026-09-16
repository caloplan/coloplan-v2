import { SdkError } from './base-error.js';

export class NotFoundError extends SdkError {
  constructor(message = 'Resource not found', opts: { statusCode?: number; response?: unknown; cause?: Error } = {}) {
    super(message, { code: 'NOT_FOUND', ...opts });
    this.name = 'NotFoundError';
  }
}
