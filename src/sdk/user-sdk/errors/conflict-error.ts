import { SdkError } from './base-error.js';

export class ConflictError extends SdkError {
  constructor(message = 'Resource conflict', opts: { statusCode?: number; response?: unknown; cause?: Error } = {}) {
    super(message, { code: 'CONFLICT', ...opts });
    this.name = 'ConflictError';
  }
}
