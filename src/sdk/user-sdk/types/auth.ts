export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  /** 邮箱验证码（注册必填） */
  code: string;
  fullName?: string;
  serviceName?: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface SendEmailCodeParams {
  email: string;
  scene?: string;
}

export interface VerifyEmailCodeParams {
  email: string;
  scene: string;
  code: string;
}

export interface EmailCodeResponse {
  message: string;
}

export interface EmailVerifyResponse {
  verified: boolean;
  message: string;
}

export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
}

export interface RefreshTokenParams {
  refreshToken?: string;
}
