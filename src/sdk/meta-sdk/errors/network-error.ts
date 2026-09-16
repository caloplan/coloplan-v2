import { SdkError } from './base-error.js';

export class NetworkError extends SdkError {
  constructor(message = 'Network error', opts: { response?: unknown; cause?: Error } = {}) {
    super(message, { code: 'NETWORK_ERROR', ...opts });
    this.name = 'NetworkError';
  }
}
