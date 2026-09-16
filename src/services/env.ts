/**
 * 运行环境配置（VITE_ 环境变量，可在 .env 或登录表单中覆盖）。
 */

interface AppEnv {
  /** mservice-fastapi-user 地址 */
  userUrl: string;
  /** mservice-fastapi-metastorage 地址 */
  metaUrl: string;
  /** fastapi-chat-service 地址（RN → caloplan-chat → fastapi-chat-service） */
  chatUrl: string;
  /**
   * 演示模式：未登录时使用 UI 层 mock 数据，保证原型开箱即用。
   * 登录成功 / 恢复登录态后自动切换到真实模块数据。
   */
  demoMode: boolean;
}

export const env: AppEnv = {
  userUrl: import.meta.env.VITE_USER_URL ?? "http://localhost:8000",
  metaUrl: import.meta.env.VITE_META_URL ?? "http://localhost:9093",
  chatUrl: import.meta.env.VITE_CHAT_URL ?? "http://localhost:9095",
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? "true") !== "false",
};
