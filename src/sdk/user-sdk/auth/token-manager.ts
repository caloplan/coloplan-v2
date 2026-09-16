import { TokenPair, JwtPayload } from '../types/common.js';
import { decodeJwtPayload } from '../utils/jwt.js';

export type TokenRefreshCallback = (tokens: TokenPair) => void;

export class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private payload: JwtPayload | null = null;
  private refreshBufferSeconds: number;
  private callbacks: Set<TokenRefreshCallback> = new Set();
  private inFlight: Promise<TokenPair> | null = null;

  constructor(refreshBufferSeconds = 60) {
    this.refreshBufferSeconds = refreshBufferSeconds;
  }

  setToken(access: string, refresh?: string): void {
    this.accessToken = access;
    if (refresh !== undefined) this.refreshToken = refresh;
    this.payload = decodeJwtPayload(access);
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getPayload(): JwtPayload | null {
    return this.payload;
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.payload = null;
  }

  isExpired(): boolean {
    if (!this.payload?.exp) return true;
    return Date.now() / 1000 >= this.payload.exp;
  }

  shouldRefresh(): boolean {
    if (!this.payload?.exp) return false;
    return Date.now() / 1000 >= this.payload.exp - this.refreshBufferSeconds;
  }

  onTokenRefresh(callback: TokenRefreshCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  async refreshIfNeeded(refreshFn: () => Promise<TokenPair>, force = false): Promise<TokenPair | null> {
    if (!force) {
      if (!this.accessToken) return null;
      if (!this.shouldRefresh() && !this.isExpired()) return null;
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = (async () => {
      try {
        const tokens = await refreshFn();
        this.setToken(tokens.accessToken, tokens.refreshToken);
        for (const cb of this.callbacks) cb(tokens);
        return tokens;
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }
}
