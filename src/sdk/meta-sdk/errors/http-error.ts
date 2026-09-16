import { SdkError } from './base-error.js';

export class HttpError extends SdkError {
  constructor(message = 'HTTP request failed', opts: { statusCode?: number; response?: unknown; cause?: Error } = {}) {
    super(message, { code: 'HTTP_ERROR', ...opts });
    this.name = 'HttpError';
  }
}
