import { HttpClient } from './http/http-client.js';
import { Logger } from './utils/logger.js';

export interface MetaSdkConfig {
  baseUrl: string;
  token?: string;
  tokenProvider?: () => string | null | Promise<string | null>;
  /** 每个请求发出前调用：用于主动续期临期/过期的 access token */
  onBeforeRequest?: () => Promise<void>;
  /** 收到 401 后调用：强制刷新 token，返回后用新 token 重试一次 */
  onUnauthorized?: () => Promise<void>;
  timeout?: number;
  maxRetries?: number;
  logger?: Logger | null;
  httpClient?: HttpClient;
}

export const DEFAULT_CONFIG = {
  timeout: 10000,
  maxRetries: 1,
};
