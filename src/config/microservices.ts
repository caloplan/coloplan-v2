/**
 * 微服务配置（CaloPlan 后端各微服务地址）。
 *
 * 这里是默认值的唯一权威来源：修改本文件即可切换服务地址；
 * 部署时可用同名 VITE_* 环境变量覆盖（优先级高于本文件），
 * 登录表单中的「服务地址（可选）」可再按会话覆盖（不写回本文件）。
 *
 * 服务端口对应关系：
 * - user:  mservice-fastapi-user（认证 / 用户 / 身体数据）
 * - meta:  mservice-fastapi-metastorage（食物 / 餐食 / 营养）
 * - chat:  fastapi-chat-service（AI 对话）
 * - file:  fastapi-file-service（图片上传，POST /api/v1/files）
 */

export interface MicroserviceConfig {
  /** mservice-fastapi-user */
  user: string;
  /** mservice-fastapi-metastorage */
  meta: string;
  /** fastapi-chat-service */
  chat: string;
  /** fastapi-file-service（图片上传） */
  file: string;
}

/** 微服务端点默认值（本地开发） */
export const microservices: MicroserviceConfig = {
  user: "http://locolhost:9092",
  meta: "http://localhost:9093",
  chat: "http://localhost:9095",
  file: "http://localhost:9094",
};
