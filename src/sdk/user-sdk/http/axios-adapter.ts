import axios, { AxiosInstance, AxiosError } from 'axios';
import { HttpClient, HttpRequestConfig, HttpResponse } from './http-client.js';
import { NetworkError } from '../errors/index.js';

export class AxiosAdapter implements HttpClient {
  private instance: AxiosInstance;

  constructor(baseUrl: string, timeout = 10000) {
    this.instance = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    try {
      const resp = await this.instance.request<T>({
        method: config.method,
        url: config.url,
        headers: config.headers,
        params: config.params,
        data: config.data,
        timeout: config.timeout,
      });
      return {
        status: resp.status,
        statusText: resp.statusText,
        data: resp.data,
        headers: resp.headers as Record<string, string>,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        return {
          status: axiosErr.response.status,
          statusText: axiosErr.response.statusText,
          data: axiosErr.response.data as T,
          headers: axiosErr.response.headers as Record<string, string>,
        };
      }
      throw new NetworkError(axiosErr.message || 'Network error', { cause: err as Error });
    }
  }
}
