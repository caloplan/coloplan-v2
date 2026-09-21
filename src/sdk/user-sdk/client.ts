import { UserSdkConfig, DEFAULT_CONFIG } from './config.js';
import { HttpClient } from './http/http-client.js';
import { AxiosAdapter } from './http/axios-adapter.js';
import { TokenManager, TokenRefreshCallback } from './auth/token-manager.js';
import { AuthInterceptor } from './auth/auth-interceptor.js';
import { AuthService } from './services/auth-service.js';
import { UserService } from './services/user-service.js';
import { JwtPayload } from './types/common.js';
import { createLogger, Logger } from './utils/logger.js';

export class UserSdk {
  readonly auth: AuthService;
  readonly users: UserService;

  private config: Required<Omit<UserSdkConfig, 'token' | 'refreshToken' | 'httpClient' | 'logger'>> & UserSdkConfig;
  private http: HttpClient;
  private tokenManager: TokenManager;
  private logger: Logger;

  constructor(config: UserSdkConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger(config.logger);
    this.http = config.httpClient ?? new AxiosAdapter(config.baseUrl, this.config.timeout);
    this.tokenManager = new TokenManager(this.config.refreshBufferSeconds);

    if (config.token) {
      this.tokenManager.setToken(config.token, config.refreshToken);
    }

    const authInterceptor = new AuthInterceptor(
      this.http,
      this.tokenManager,
      () => this.auth.refresh(),
      this.config.autoRefresh,
      this.logger,
    );

    this.auth = new AuthService(authInterceptor, this.tokenManager, this.http);
    this.users = new UserService(authInterceptor);
  }

  getToken(): string | null {
    return this.tokenManager.getToken();
  }

  getRefreshToken(): string | null {
    return this.tokenManager.getRefreshToken();
  }

  getTokenPayload(): JwtPayload | null {
    return this.tokenManager.getPayload();
  }

  setToken(access: string, refresh?: string): void {
    this.tokenManager.setToken(access, refresh);
  }

  clearToken(): void {
    this.tokenManager.clear();
  }

  isAuthenticated(): boolean {
    return !!this.tokenManager.getToken() && !this.tokenManager.isExpired();
  }

  onTokenRefresh(callback: TokenRefreshCallback): () => void {
    return this.tokenManager.onTokenRefresh(callback);
  }

  /**
   * 供 meta 等其他 SDK 在发请求前确保 access token 新鲜：
   * - 临期/过期时用 refresh token 静默换新（in-flight 去重，并发只刷一次）；
   * - force=true 用于收到 401 后的强制续期。
   * 刷新失败（refresh token 也过期）会抛出，由调用方按需重新登录处理。
   */
  async refreshIfNeeded(force = false): Promise<void> {
    await this.tokenManager.refreshIfNeeded(() => this.auth.refresh(), force);
  }

  close(): void {
    this.tokenManager.clear();
  }
}
