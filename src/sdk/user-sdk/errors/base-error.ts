export class SdkError extends Error {
  code: string;
  statusCode?: number;
  response?: unknown;
  cause?: Error;

  constructor(message: string, opts: { code?: string; statusCode?: number; response?: unknown; cause?: Error } = {}) {
    super(message);
    this.name = 'SdkError';
    this.code = opts.code ?? 'SDK_ERROR';
    this.statusCode = opts.statusCode;
    this.response = opts.response;
    this.cause = opts.cause;
  }
}
