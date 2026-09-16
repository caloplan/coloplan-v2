/**
 * 业务数据缓存工具（经 caloplan-cache → localStorage）。
 *
 * caloplan-cache 是"缓存优先、命中不触网"的通用缓存；此处组合 get + refresh
 * 实现 SWR 语义：进入页面先渲染旧缓存，再请求新数据覆盖 —— 无需等网络即可看到内容。
 *
 * 边界（遵循既定原则）：
 * - cache 只管"如何存储"（key / localStorage），业务模块管"存什么"（producer）
 * - RN 不直接操作 localStorage
 */
import { getCPCache } from "caloplan-cache";
import type { Cache } from "caloplan-cache";

/** 统一缓存单例（bootstrap 启动时已 createCPCache，这里只取） */
export function dataCache(): Cache {
  return getCPCache();
}

export interface SwrResult<T> {
  /** 旧缓存数据；无缓存为 null（此时 fresh 亦为 null，加载失败由调用方处理） */
  cached: T | null;
  /** 后台刷新拿到的新数据；刷新失败为 null（保留旧数据展示） */
  fresh: T | null;
}

/**
 * SWR 加载：
 * 1. register producer（重复注册覆盖，每次调用都重新注册以捕获最新闭包）
 * 2. get：命中缓存 → 立即返回旧数据（不触网）；未命中 → producer 生产（首次即最新）并回写
 * 3. 仅当 get 命中了旧缓存时才 refresh 后台取新数据覆盖；get 已生产过则不再重复请求
 */
export async function swrLoad<T>(
  key: string,
  producer: () => Promise<T> | T,
): Promise<SwrResult<T>> {
  const cache = getCPCache();
  let produced = 0;
  cache.register(key, () => {
    produced += 1;
    return producer();
  });

  let cached: T | null = null;
  try {
    cached = await cache.get<T>(key);
  } catch (err) {
    // get 未命中且 producer 生产失败（或缓存损坏）：无旧数据可用，交给调用方显示错误
    throw err;
  }

  // get 未命中且 producer 生产成功：cached 即最新数据，无需再 refresh
  if (produced > 0) {
    return { cached, fresh: null };
  }

  if (cached == null) {
    // producer 返回 null（不应当发生，防御处理）
    return { cached: null, fresh: null };
  }

  // 命中了旧缓存 → 后台刷新覆盖
  try {
    const fresh = await cache.refresh<T>(key);
    return { cached, fresh };
  } catch {
    // 刷新失败：保留旧数据展示
    return { cached, fresh: null };
  }
}
