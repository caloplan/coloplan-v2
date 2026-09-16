import { SdkError } from './base-error.js';

export class ValidationError extends SdkError {
  fields?: Record<string, string[]>;

  constructor(message = 'Validation failed', opts: { statusCode?: number; response?: unknown; fields?: Record<string, string[]>; cause?: Error } = {}) {
    super(message, { code: 'VALIDATION_ERROR', ...opts });
    this.name = 'ValidationError';
    this.fields = opts.fields;
  }
}
