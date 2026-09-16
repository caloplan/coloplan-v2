/**
 * 运行环境配置（VITE_ 环境变量与微服务配置文件叠加）。
 *
 * 优先级：VITE_* 环境变量 > src/config/microservices.ts 默认值。
 * 微服务地址默认值统一在配置文件维护；部署时用环境变量覆盖。
 */

import { microservices } from "@/config/microservices";

interface AppEnv {
  /** mservice-fastapi-user 地址 */
  userUrl: string;
  /** mservice-fastapi-metastorage 地址 */
  metaUrl: string;
  /** fastapi-chat-service 地址（RN → caloplan-chat → fastapi-chat-service） */
  chatUrl: string;
  /** fastapi-file-service 地址（图片上传：RN 直连 POST /api/v1/files） */
  fileUrl: string;
  /**
   * 演示模式：未登录时使用 UI 层 mock 数据，保证原型开箱即用。
   * 登录成功 / 恢复登录态后自动切换到真实模块数据。
   */
  demoMode: boolean;
}

export const env: AppEnv = {
  userUrl: import.meta.env.VITE_USER_URL ?? microservices.user,
  metaUrl: import.meta.env.VITE_META_URL ?? microservices.meta,
  chatUrl: import.meta.env.VITE_CHAT_URL ?? microservices.chat,
  fileUrl: import.meta.env.VITE_FILE_URL ?? microservices.file,
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? "true") !== "false",
};
