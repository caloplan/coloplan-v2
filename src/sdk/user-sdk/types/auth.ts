export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  serviceName?: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
}

export interface RefreshTokenParams {
  refreshToken?: string;
}
