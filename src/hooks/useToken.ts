/**
 * 用户 Token 用量 Hook：读取当前登录用户的 LLM Token 使用快照 / 配额 / 剩余额度。
 *
 * 数据源：caloplan-token（client 只读），不直连 fastapi-token-service，
 * 经 fastapi-chat-service 门户转发（GET /api/v1/token/usage|quota|remaining），
 * 透传当前用户 JWT。匿名（demo）模式下不查询。
 *
 * 缓存策略：与 Today 页一致走 SWR —— 进入页面先渲染 caloplan-cache 中的旧快照
 * （不触网、立即可见），随后后台静默刷新覆盖；页面停留期间每 60s 静默刷新一次，
 * UI 不出现加载态闪烁，数值变化由 AnimatedNumber 动画呈现。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TokenQuota, TokenRemaining, TokenUsageSnapshot } from "caloplan-token";
import { getCPToken } from "caloplan-token";
import { useAuth } from "./useAuth";
import { swrLoad } from "@/services/cache";

export interface TokenViewModel {
  loading: boolean;
  error: string | null;
  usage: TokenUsageSnapshot | null;
  quota: TokenQuota | null;
  remaining: TokenRemaining | null;
  refresh: () => void;
}

/** Token 快照缓存载荷 */
interface TokenSnapshot {
  usage: TokenUsageSnapshot | null;
  quota: TokenQuota | null;
  remaining: TokenRemaining | null;
}

/** 页面停留期间的静默刷新间隔（ms） */
const SILENT_REFRESH_MS = 60_000;

export function useToken(): TokenViewModel {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TokenUsageSnapshot | null>(null);
  const [quota, setQuota] = useState<TokenQuota | null>(null);
  const [remaining, setRemaining] = useState<TokenRemaining | null>(null);
  // 已有快照时静默刷新（不置 loading，避免 UI 闪烁）
  const hasSnapshot = useRef(false);

  const applySnapshot = useCallback((snap: TokenSnapshot) => {
    setUsage(snap.usage);
    setQuota(snap.quota);
    setRemaining(snap.remaining);
  }, []);

  const refresh = useCallback(async () => {
    if (auth.status !== "authenticated") {
      setUsage(null);
      setQuota(null);
      setRemaining(null);
      setError(null);
      setLoading(false);
      hasSnapshot.current = false;
      return;
    }
    if (!hasSnapshot.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const cpToken = getCPToken();
      const key = "caloplan_token_snapshot";
      const res = await swrLoad<TokenSnapshot>(key, async () => {
        const [u, q, r] = await Promise.all([
          cpToken.getUsage(),
          cpToken.getQuota(),
          cpToken.getRemaining(),
        ]);
        return { usage: u, quota: q, remaining: r };
      });
      if (res.cached) {
        // 命中缓存：立即渲染旧快照（不触网），再后台刷新覆盖
        hasSnapshot.current = true;
        applySnapshot(res.cached);
        setLoading(false);
      }
      if (res.fresh) {
        applySnapshot(res.fresh);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [auth.status, applySnapshot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 页面停留期间静默刷新（仅登录态）
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    const timer = setInterval(() => void refresh(), SILENT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [auth.status, refresh]);

  return { loading, error, usage, quota, remaining, refresh };
}
