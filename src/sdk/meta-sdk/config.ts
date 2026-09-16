import { HttpClient } from './http/http-client.js';
import { Logger } from './utils/logger.js';

export interface MetaSdkConfig {
  baseUrl: string;
  token?: string;
  tokenProvider?: () => string | null | Promise<string | null>;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger | null;
  httpClient?: HttpClient;
}

export const DEFAULT_CONFIG = {
  timeout: 10000,
  maxRetries: 1,
};
