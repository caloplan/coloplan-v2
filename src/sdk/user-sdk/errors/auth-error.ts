import { SdkError } from './base-error.js';

export class AuthError extends SdkError {
  constructor(message = 'Authentication failed', opts: { statusCode?: number; response?: unknown; cause?: Error } = {}) {
    super(message, { code: 'AUTH_ERROR', ...opts });
    this.name = 'AuthError';
  }
}
