import { HttpClient, HttpRequestConfig, HttpResponse } from '../http/http-client.js';
import { TokenManager } from './token-manager.js';
import { TokenPair } from '../types/common.js';
import { mapHttpError, AuthError } from '../errors/index.js';
import { Logger } from '../utils/logger.js';

export class AuthInterceptor implements HttpClient {
  private http: HttpClient;
  private tokenManager: TokenManager;
  private refreshFn: () => Promise<TokenPair>;
  private autoRefresh: boolean;
  private logger: Logger;
  private retriedRequests: Set<string> = new Set();

  constructor(
    http: HttpClient,
    tokenManager: TokenManager,
    refreshFn: () => Promise<TokenPair>,
    autoRefresh: boolean,
    logger: Logger,
  ) {
    this.http = http;
    this.tokenManager = tokenManager;
    this.refreshFn = refreshFn;
    this.autoRefresh = autoRefresh;
    this.logger = logger;
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const requestId = `${config.method}:${config.url}:${Date.now()}`;

    if (this.autoRefresh) {
      await this.tokenManager.refreshIfNeeded(this.refreshFn);
    }

    const token = this.tokenManager.getToken();
    const headers = { ...config.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const resp = await this.http.request<T>({ ...config, headers });

    if (resp.status === 401 && this.autoRefresh && !this.retriedRequests.has(requestId)) {
      this.retriedRequests.add(requestId);
      this.logger.debug('401 received, refreshing token and retrying');
      try {
        await this.tokenManager.refreshIfNeeded(this.refreshFn, true);
        const newToken = this.tokenManager.getToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }
        const retryResp = await this.http.request<T>({ ...config, headers });
        this.retriedRequests.delete(requestId);
        if (retryResp.status >= 400) {
          throw mapHttpError(retryResp.status, retryResp.data);
        }
        return retryResp;
      } catch (err) {
        this.retriedRequests.delete(requestId);
        if (err instanceof AuthError) throw err;
        throw new AuthError('Token refresh failed', { cause: err as Error });
      }
    }

    if (resp.status === 403) {
      throw new AuthError('Forbidden', { statusCode: 403, response: resp.data });
    }

    if (resp.status >= 400) {
      throw mapHttpError(resp.status, resp.data);
    }

    return resp;
  }
}
