export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
}

export interface JwtPayload {
  sub: string;
  userId: number;
  serviceName: string;
  role: string;
  type: 'access' | 'refresh';
  exp: number;
  iat?: number;
}
