/**
 * SDK 组装层：创建真实 UserSdk / MetaSdk 实例。
 *
 * 来源：server-meta-admin/src/sdk（既有 SDK 基础设施），与
 * caloplan-v2-demo-test-non-chat 的组装方式一致。SDK 仅负责
 * HTTP + Token 透传，业务职责全部留在 caloplan-* 模块。
 */
import { UserSdk, FetchAdapter as UserFetchAdapter } from "@/sdk/user-sdk/index.js";
import { MetaSdk, FetchAdapter as MetaFetchAdapter } from "@/sdk/meta-sdk/index.js";

export interface SdkPair {
  userSdk: UserSdk;
  metaSdk: MetaSdk;
}

/** 创建 SDK 对：MetaSDK 自动从 UserSDK 取 token（登录后即生效） */
export function createSdkPair(userUrl: string, metaUrl: string): SdkPair {
  const userSdk = new UserSdk({
    baseUrl: userUrl,
    httpClient: new UserFetchAdapter(userUrl),
  });
  const metaSdk = new MetaSdk({
    baseUrl: metaUrl,
    httpClient: new MetaFetchAdapter(metaUrl),
    tokenProvider: () => userSdk.getToken(),
  });
  return { userSdk, metaSdk };
}
