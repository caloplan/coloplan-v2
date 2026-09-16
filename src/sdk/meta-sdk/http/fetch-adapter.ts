import { HttpClient, HttpRequestConfig, HttpResponse } from './http-client.js';
import { NetworkError } from '../errors/index.js';

export class FetchAdapter implements HttpClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const url = this.buildUrl(config.url, config.params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout ?? this.timeout);

    try {
      const headers: Record<string, string> = { ...config.headers };
      let body: string | URLSearchParams | undefined;
      if (config.data !== undefined) {
        if (config.data instanceof URLSearchParams) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          body = config.data.toString();
        } else if (typeof config.data === 'string') {
          body = config.data;
        } else {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(config.data);
        }
      }

      const resp = await fetch(url, {
        method: config.method,
        headers,
        body,
        signal: controller.signal,
      });

      let data: T;
      const contentType = resp.headers.get('content-type') || '';
      const text = await resp.text();
      if (!text) {
        // 空响应体（如 204 No Content / 删除成功），不解析，避免 JSON.parse 抛错
        data = undefined as T;
      } else if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          // 声明是 JSON 但实际不是合法 JSON：回退为原始文本，不再抛错
          data = text as unknown as T;
        }
      } else {
        data = text as unknown as T;
      }

      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });

      return {
        status: resp.status,
        statusText: resp.statusText,
        data,
        headers: respHeaders,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new NetworkError('Request timeout', { cause: err });
      }
      throw new NetworkError((err as Error).message || 'Network error', { cause: err as Error });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    let url = this.baseUrl + path;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          search.append(key, String(value));
        }
      }
      const qs = search.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    return url;
  }
}
