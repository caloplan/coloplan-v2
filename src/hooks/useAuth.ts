/**
 * 登录态 Hook：订阅应用服务层 AuthSnapshot。
 */
import { useSyncExternalStore } from "react";
import { appServices } from "@/services/bootstrap";
import type { AuthSnapshot } from "@/services/bootstrap";
import { env } from "@/services/env";

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(
    (cb) => appServices.subscribe(cb),
    () => appServices.getAuth(),
  );
}

/** 是否处于 demo 数据模式（匿名且开启演示模式） */
export function useIsDemo(): boolean {
  const auth = useAuth();
  return auth.status === "anonymous" && env.demoMode;
}
