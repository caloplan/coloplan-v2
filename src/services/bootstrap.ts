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
import type { UserInfo } from "@/sdk/user-sdk/index.js";

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
      try {
        // 服务地址一律以 .env（env.*）为准，持久化仅保留 token：
        // 修改 .env 切换环境后，已登录用户刷新页面即生效，无需重新登录。
        const pair = createSdkPair(env.userUrl, env.metaUrl);
        pair.userSdk.setToken(stored.access, stored.refresh);
        const profile = await pair.userSdk.users.getMe();
        this.pair = pair;
        this.registerTokenPersistence(pair);
        this.initBusiness(pair, env.chatUrl, toUserProfile(profile));
        this.setAuth({ status: "authenticated", profile: toUserProfile(profile) });
        return;
      } catch {
        // Token 失效 / 服务不可达：清理持久化，回退匿名态
        clearPersistedTokens();
      }
    }
    this.pair = createSdkPair(env.userUrl, env.metaUrl);
    this.setAuth({ status: "anonymous", profile: null });
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
        writePersistedTokens({
          access: pair.userSdk.getToken() ?? "",
          refresh: pair.userSdk.getRefreshToken() ?? "",
          userUrl: p.userUrl,
          metaUrl: p.metaUrl,
          chatUrl: p.chatUrl,
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
