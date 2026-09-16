import { HttpClient } from './http/http-client.js';
import { Logger } from './utils/logger.js';

export interface UserSdkConfig {
  baseUrl: string;
  token?: string;
  refreshToken?: string;
  autoRefresh?: boolean;
  refreshBufferSeconds?: number;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger | null;
  httpClient?: HttpClient;
}

export const DEFAULT_CONFIG = {
  autoRefresh: true,
  refreshBufferSeconds: 60,
  timeout: 10000,
  maxRetries: 1,
};
