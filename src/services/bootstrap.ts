/**
 * CaloPlan 应用服务层：SDK 组装 + 登录态 + 业务模块注入。
 *
 * 职责边界（遵循既有架构）：
 * - SDK（HTTP + Token 生命周期）来自 server-meta-admin 既有实现，本层只负责创建与注入；
 * - Token 持久化经 caloplan-cache（RN 不直接操作 localStorage）；
 * - caloplan-core / caloplan-user / caloplan-chat 以单例注入，业务数据只走这些模块；
 * - UI 组件不感知 SDK 细节，只通过 useAuth / hooks 读取登录态。
 */
import { createCPCache } from "caloplan-cache";
import { createCPCore, getCPCore } from "caloplan-core";
import { createCPUser, getCPUser } from "caloplan-user";
import type { UserSdkLike, UserProfile } from "caloplan-user";
import { createCPChat, getCPChat } from "caloplan-chat";
import { createCPToken, getCPToken } from "caloplan-token";
import { createSdkPair } from "./sdk";
import type { SdkPair } from "./sdk";
import { env } from "./env";
import { AuthError } from "@/sdk/user-sdk/index.js";
import type { UserInfo } from "@/sdk/user-sdk/index.js";

/** 判断是否为"令牌确实失效"的鉴权失败（401/403）；网络错误等瞬态异常不算 */
function isAuthFailure(err: unknown): boolean {
  if (err instanceof AuthError) return true;
  const e = err as { statusCode?: number } | null | undefined;
  return e?.statusCode === 401 || e?.statusCode === 403;
}

/** SDK 契约（camelCase）→ caloplan-user 领域模型（snake_case） */
function toUserProfile(u: UserInfo): UserProfile {
  return {
    user_id: u.id,
    username: u.username,
    email: u.email,
    full_name: u.fullName,
    service_name: u.serviceName,
    role: u.role,
    created_time: u.createdAt,
    updated_time: u.updatedAt,
  };
}

/* ──────────────── 登录态 ──────────────── */

export type AuthStatus = "unknown" | "anonymous" | "authenticated";

export interface AuthSnapshot {
  status: AuthStatus;
  profile: UserProfile | null;
}

/* ──────────────── Token 持久化（经 caloplan-cache → localStorage） ──────────────── */

interface PersistedTokens {
  access: string;
  refresh: string;
  userUrl: string;
  metaUrl: string;
  chatUrl: string;
}

const TOKENS_KEY = "auth_tokens";

const cache = createCPCache();

let persistedTokens: PersistedTokens | null = null;
cache.register(TOKENS_KEY, () => persistedTokens);

async function readPersistedTokens(): Promise<PersistedTokens | null> {
  try {
    return await cache.get<PersistedTokens>(TOKENS_KEY);
  } catch {
    return null;
  }
}

async function writePersistedTokens(tokens: PersistedTokens): Promise<void> {
  persistedTokens = tokens;
  await cache.refresh(TOKENS_KEY);
}

function clearPersistedTokens(): void {
  persistedTokens = null;
  cache.delete(TOKENS_KEY);
}

/* ──────────────── 服务单例 ──────────────── */

class AppServices {
  private pair: SdkPair | null = null;
  private snapshot: AuthSnapshot = { status: "unknown", profile: null };
  private listeners = new Set<(snapshot: AuthSnapshot) => void>();

  /* ── 订阅 ── */

  getAuth(): AuthSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setAuth(snapshot: AuthSnapshot): void {
    this.snapshot = snapshot;
    for (const l of this.listeners) l(snapshot);
  }

  /* ── 启动：恢复持久化登录态；失败则匿名（demo 模式） ── */

  async boot(): Promise<void> {
    const stored = await readPersistedTokens();
    if (stored?.access) {
      // 关键：把 localStorage 里读到的 token 回填到模块级 persistedTokens，
      // 否则后续 onTokenRefresh 回调里 `if (p = persistedTokens)` 判断为 null，
      // 刷新后的新 refresh_token 永远不会写回磁盘 —— 表现为"刷新页面就要重新登录"。
      persistedTokens = stored;
      const pair = createSdkPair(env.userUrl, env.metaUrl);
      pair.userSdk.setToken(stored.access, stored.refresh);
      try {
        // 服务地址一律以 .env（env.*）为准，持久化仅保留 token：
        // 修改 .env 切换环境后，已登录用户刷新页面即生效，无需重新登录。
        const profile = await this.validateProfile(pair);
        this.pair = pair;
        this.registerTokenPersistence(pair);
        this.initBusiness(pair, env.chatUrl, toUserProfile(profile));
        this.setAuth({ status: "authenticated", profile: toUserProfile(profile) });
        return;
      } catch (err) {
        // 仅当确定令牌已失效（401/403 鉴权失败）时才清理持久化 token；
        // 网络不可达 / 请求超时等瞬态错误必须保留 token：移动端（尤其 iOS）
        // 切后台恢复时页面常被重载且网络未就绪，若误清 token 就会"动不动要重新登录"。
        if (isAuthFailure(err)) {
          clearPersistedTokens();
        } else {
          console.warn("[auth] boot 校验失败但非鉴权错误，保留 token，本次回退匿名", err);
          // 保留带 token 的 pair（而不是换成空 pair）：本次会话请求仍带 token，
          // 网络恢复后可自动续期；同时后台静默重试一次，成功即恢复登录态。
          this.pair = pair;
          this.setAuth({ status: "anonymous", profile: null });
          void this.recoverInBackground(pair);
          return;
        }
      }
    }
    this.pair = createSdkPair(env.userUrl, env.metaUrl);
    this.setAuth({ status: "anonymous", profile: null });
  }

  /** boot 校验 getMe：非鉴权错误（网络未就绪 / 超时）时重试一次，避免 iOS 冷启动误判未登录 */
  private async validateProfile(pair: SdkPair, attempts = 2): Promise<UserInfo> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await pair.userSdk.users.getMe();
      } catch (err) {
        lastErr = err;
        if (isAuthFailure(err)) throw err;
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600));
      }
    }
    throw lastErr;
  }

  /** 后台静默恢复登录态：延迟重试 getMe，成功则切换为已登录；期间用户若手动登录则放弃 */
  private async recoverInBackground(pair: SdkPair): Promise<void> {
    try {
      await new Promise((r) => setTimeout(r, 1500));
      if (this.pair !== pair) return;
      const profile = await pair.userSdk.users.getMe();
      if (this.pair !== pair) return;
      this.registerTokenPersistence(pair);
      this.initBusiness(pair, env.chatUrl, toUserProfile(profile));
      this.setAuth({ status: "authenticated", profile: toUserProfile(profile) });
    } catch {
      // 保持匿名，等下次启动 / 用户操作时再试
    }
  }

  /* ── 登录 / 注册 ── */

  async login(params: {
    username: string;
    password: string;
    userUrl?: string;
    metaUrl?: string;
    chatUrl?: string;
  }): Promise<void> {
    const userUrl = params.userUrl?.trim() || env.userUrl;
    const metaUrl = params.metaUrl?.trim() || env.metaUrl;
    const chatUrl = params.chatUrl?.trim() || env.chatUrl;

    const pair = createSdkPair(userUrl, metaUrl);
    try {
      await pair.userSdk.auth.login({ username: params.username, password: params.password });
      const profile = await pair.userSdk.users.getMe();
      this.pair = pair;
      await writePersistedTokens({
        access: pair.userSdk.getToken() ?? "",
        refresh: pair.userSdk.getRefreshToken() ?? "",
        userUrl,
        metaUrl,
        chatUrl,
      });
      this.registerTokenPersistence(pair);
      this.initBusiness(pair, chatUrl, toUserProfile(profile));
      this.setAuth({ status: "authenticated", profile: toUserProfile(profile) });
    } catch (err) {
      this.pair = createSdkPair(env.userUrl, env.metaUrl);
      clearPersistedTokens();
      throw err;
    }
  }

  async register(params: {
    username: string;
    email: string;
    password: string;
    code: string;
    /** 姓名/昵称（可选）；为空传 undefined，后端存 null，渲染时回退 username */
    fullName?: string;
    userUrl?: string;
    metaUrl?: string;
    chatUrl?: string;
  }): Promise<void> {
    const userUrl = params.userUrl?.trim() || env.userUrl;
    const metaUrl = params.metaUrl?.trim() || env.metaUrl;
    const chatUrl = params.chatUrl?.trim() || env.chatUrl;

    const pair = createSdkPair(userUrl, metaUrl);
    try {
      await pair.userSdk.auth.register({
        username: params.username,
        email: params.email,
        password: params.password,
        code: params.code,
        fullName: params.fullName?.trim() || undefined,
        // 本应用固定归属 caloplan 服务名（后端 UserCreate.service_name 默认 "default"，这里显式指定）
        serviceName: "caloplan",
      });
      const profile = await pair.userSdk.users.getMe();
      this.pair = pair;
      await writePersistedTokens({
        access: pair.userSdk.getToken() ?? "",
        refresh: pair.userSdk.getRefreshToken() ?? "",
        userUrl,
        metaUrl,
        chatUrl,
      });
      this.registerTokenPersistence(pair);
      this.initBusiness(pair, chatUrl, toUserProfile(profile));
      this.setAuth({ status: "authenticated", profile: toUserProfile(profile) });
    } catch (err) {
      this.pair = createSdkPair(env.userUrl, env.metaUrl);
      clearPersistedTokens();
      throw err;
    }
  }

  /** 发送邮箱验证码（注册场景）；供登录表单「获取验证码」调用 */
  async sendEmailCode(email: string, scene = "register"): Promise<void> {
    const pair = this.pair ?? createSdkPair(env.userUrl, env.metaUrl);
    await pair.userSdk.auth.sendEmailCode({ email, scene });
  }

  /* ── 登出 / 注销 ── */

  async logout(): Promise<void> {
    try {
      await this.pair?.userSdk.auth.logout();
    } catch {
      // 忽略登出网络错误，本地状态仍要清理
    }
    this.pair = createSdkPair(env.userUrl, env.metaUrl);
    clearPersistedTokens();
    this.setAuth({ status: "anonymous", profile: null });
  }

  /** 注销当前账号（软删除，调 caloplan-user → UserService） */
  async deleteAccount(): Promise<void> {
    await getCPUser().user.deleteAccount();
    await this.logout();
  }

  /* ── 业务模块注入 ── */

  /** Token 轮换持久化：refresh 后把新 token 写回 localStorage（后端为一次性轮换） */
  private registerTokenPersistence(pair: SdkPair): void {
    pair.userSdk.onTokenRefresh(() => {
      const p = persistedTokens;
      if (p) {
        void writePersistedTokens({
          access: pair.userSdk.getToken() ?? "",
          refresh: pair.userSdk.getRefreshToken() ?? "",
          userUrl: p.userUrl,
          metaUrl: p.metaUrl,
          chatUrl: p.chatUrl,
        }).catch((err) => {
          console.warn("[auth] 刷新后 token 持久化失败（localStorage 不可用？）", err);
        });
      }
    });
  }

  private initBusiness(pair: SdkPair, chatUrl: string, profile: UserProfile): void {
    const userIdProvider = () => String(profile.user_id);

    // 契约适配：真实 UserSdk.auth.login 接收对象参数，caloplan-user 类型契约期望 (username, password)
    const userSdkLike: UserSdkLike = {
      auth: {
        login: (username, password) => pair.userSdk.auth.login({ username, password }),
        register: (p) =>
          pair.userSdk.auth.register({ ...p, fullName: p.fullName ?? undefined }),
        refresh: (refreshToken) => pair.userSdk.auth.refresh(refreshToken),
        logout: () => pair.userSdk.auth.logout(),
        sendEmailCode: (p) => pair.userSdk.auth.sendEmailCode(p),
        verifyEmailCode: (p) => pair.userSdk.auth.verifyEmailCode(p),
      },
      users: pair.userSdk.users,
    };

    createCPCore(pair.metaSdk, userIdProvider);
    createCPUser(userSdkLike, pair.metaSdk, userIdProvider);
    createCPChat({
      baseURL: chatUrl,
      tokenProvider: () => pair.userSdk.getToken(),
      cache,
    });
    // 用户 Token 用量（caloplan-token，client 只读）：
    // 不直连 fastapi-token-service，经 fastapi-chat-service 门户转发
    // （GET /api/v1/token/usage|quota|remaining），透传当前用户 JWT。
    createCPToken({
      baseURL: chatUrl,
      tokenProvider: () => pair.userSdk.getToken(),
    });
  }

  /* ── 模块访问（未初始化时抛出明确错误） ── */

  requireCPCore() {
    return getCPCore();
  }

  requireCPUser() {
    return getCPUser();
  }

  requireCPChat() {
    return getCPChat();
  }

  requireCPToken() {
    return getCPToken();
  }

  /** 当前 access token（图片上传等需要直连鉴权服务的场景使用；未登录返回 null） */
  getAccessToken(): string | null {
    return this.pair?.userSdk.getToken() ?? null;
  }
}

/** 应用服务单例 */
export const appServices = new AppServices();
