import { HttpClient } from '../http/http-client.js';
import { TokenManager } from '../auth/token-manager.js';
import { TokenPair } from '../types/common.js';
import { RegisterParams, LoginParams } from '../types/auth.js';
import { camelToSnake, snakeToCamel } from '../utils/case-convert.js';

export class AuthService {
  private http: HttpClient;
  private rawHttp: HttpClient;
  private tokenManager: TokenManager;

  constructor(http: HttpClient, tokenManager: TokenManager, rawHttp?: HttpClient) {
    this.http = http;
    this.rawHttp = rawHttp ?? http;
    this.tokenManager = tokenManager;
  }

  async register(params: RegisterParams): Promise<TokenPair> {
    const body = camelToSnake<Record<string, unknown>>(params);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/auth/register',
      data: body,
    });
    const tokens = snakeToCamel<TokenPair>(resp.data);
    this.tokenManager.setToken(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async login(params: LoginParams): Promise<TokenPair> {
    const form = new URLSearchParams();
    form.append('username', params.username);
    form.append('password', params.password);
    const resp = await this.http.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: form,
    });
    const tokens = snakeToCamel<TokenPair>(resp.data);
    this.tokenManager.setToken(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async refresh(refreshToken?: string): Promise<TokenPair> {
    const token = refreshToken ?? this.tokenManager.getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
    }
    const resp = await this.rawHttp.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      data: { refresh_token: token },
    });
    const tokens = snakeToCamel<TokenPair>(resp.data);
    this.tokenManager.setToken(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async logout(): Promise<void> {
    try {
      await this.http.request({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });
    } finally {
      this.tokenManager.clear();
    }
  }
}
