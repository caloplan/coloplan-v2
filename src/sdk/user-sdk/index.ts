export { UserSdk } from './client.js';
export type { UserSdkConfig } from './config.js';

export * from './types/index.js';

export {
  SdkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConflictError,
  HttpError,
  NetworkError,
  mapHttpError,
} from './errors/index.js';

export type { HttpClient, HttpRequestConfig, HttpResponse, HttpMethod } from './http/http-client.js';
export { AxiosAdapter } from './http/axios-adapter.js';
export { FetchAdapter } from './http/fetch-adapter.js';

export type { Logger } from './utils/logger.js';
export { decodeJwtPayload } from './utils/jwt.js';
