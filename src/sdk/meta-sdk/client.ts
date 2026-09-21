import { MetaSdkConfig, DEFAULT_CONFIG } from './config.js';
import { HttpClient, HttpRequestConfig, HttpResponse } from './http/http-client.js';
import { AxiosAdapter } from './http/axios-adapter.js';
import { TypeService } from './services/type-service.js';
import { EntryService } from './services/entry-service.js';
import { mapHttpError, AuthError } from './errors/index.js';
import { createLogger, Logger } from './utils/logger.js';

class TokenAuthHttpClient implements HttpClient {
  private http: HttpClient;
  private token: string | null;
  private tokenProvider?: () => string | null | Promise<string | null>;
  private onBeforeRequest?: () => Promise<void>;
  private onUnauthorized?: () => Promise<void>;
  private logger: Logger;

  constructor(
    http: HttpClient,
    token: string | null,
    tokenProvider: MetaSdkConfig['tokenProvider'],
    hooks: {
      onBeforeRequest?: MetaSdkConfig['onBeforeRequest'];
      onUnauthorized?: MetaSdkConfig['onUnauthorized'];
    },
    logger: Logger,
  ) {
    this.http = http;
    this.token = token;
    this.tokenProvider = tokenProvider;
    this.onBeforeRequest = hooks.onBeforeRequest;
    this.onUnauthorized = hooks.onUnauthorized;
    this.logger = logger;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  setTokenProvider(fn: () => string | null | Promise<string | null>): void {
    this.tokenProvider = fn;
  }

  private async resolveToken(): Promise<string | null> {
    if (this.tokenProvider) {
      try {
        return await this.tokenProvider();
      } catch (err) {
        this.logger.error('tokenProvider threw:', err);
        return null;
      }
    }
    return this.token;
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // 主动续期：发请求前确保 access token 新鲜（临期/过期时静默换新）
    if (this.onBeforeRequest) {
      try {
        await this.onBeforeRequest();
      } catch (err) {
        this.logger.error('onBeforeRequest refresh failed:', err);
      }
    }

    let token = await this.resolveToken();
    const headers = { ...config.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let resp = await this.http.request<T>({ ...config, headers });

    // 401：强制刷新一次，换新 token 后重试（仅重试一次，避免死循环）
    if (resp.status === 401 && this.onUnauthorized) {
      try {
        await this.onUnauthorized();
        token = await this.resolveToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        resp = await this.http.request<T>({ ...config, headers });
      } catch (err) {
        throw new AuthError('Token refresh failed', { cause: err as Error });
      }
    }

    if (resp.status === 401) {
      throw new AuthError('Unauthorized', { statusCode: 401, response: resp.data });
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

export class MetaSdk {
  readonly types: TypeService;
  readonly entries: EntryService;

  private authHttp: TokenAuthHttpClient;

  constructor(config: MetaSdkConfig) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    const logger = createLogger(config.logger);
    const rawHttp = config.httpClient ?? new AxiosAdapter(config.baseUrl, merged.timeout);

    this.authHttp = new TokenAuthHttpClient(
      rawHttp,
      config.token ?? null,
      config.tokenProvider,
      {
        onBeforeRequest: config.onBeforeRequest,
        onUnauthorized: config.onUnauthorized,
      },
      logger,
    );

    this.types = new TypeService(this.authHttp);
    this.entries = new EntryService(this.authHttp);
  }

  setToken(token: string): void {
    this.authHttp.setToken(token);
  }

  setTokenProvider(fn: () => string | null | Promise<string | null>): void {
    this.authHttp.setTokenProvider(fn);
  }

  clearToken(): void {
    this.authHttp.setToken(null);
  }

  close(): void {
    this.authHttp.setToken(null);
  }
}
