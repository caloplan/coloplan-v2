/**
 * 首次使用引导（Onboarding）。
 *
 * - 仅对「已登录且未完成过引导」的用户弹出（enabled 由 App 根据登录态传入）。
 * - 首次进入（localStorage 无 `caloplan_onboarded_v1`）时弹出引导。
 * - 引导步骤会驱动 App 切到对应 tab，高亮讲解后引导用户。
 * - 「下一步 / 跳过 / 完成」都会写入已完成标记，之后不再弹出。
 */
import { useCallback, useEffect, useState } from "react";

const FLAG_KEY = "caloplan_onboarded_v1";

export interface OnboardingStep {
  /** 这一步展示在哪个 tab */
  tab: "today" | "meals" | "ai";
  /** 卡片指向的元素描述（小标签） */
  tag: string;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    tab: "today",
    tag: "今天",
    title: "欢迎使用 CaloPlan 👋",
    body:
      "一个帮你记录饮食、管理每日营养目标的轻量工具。跟着下面三步快速上手，30 秒就能学会。",
  },
  {
    tab: "today",
    tag: "Today",
    title: "今日总览",
    body:
      "这里一眼看到今天的摄入热量、碳水/蛋白/脂肪进度，以及还剩多少额度。身体数据来自你的个人资料。",
  },
  {
    tab: "meals",
    tag: "Meals",
    title: "餐食记录",
    body:
      "早餐 / 午餐 / 晚餐 / 加餐分别归档。想调整份量？长按食物行就能编辑。新增餐食不用手动加——直接告诉 AI。",
  },
  {
    tab: "ai",
    tag: "AI",
    title: "AI 助手（核心）",
    body:
      "直接用自然语言说「今天中午吃了米饭和鸡胸肉」，AI 会帮你识别、记录，并在需要你确认时弹出审批卡片。",
  },
  {
    tab: "today",
    tag: "Account",
    title: "账户",
    body:
      "点右上角头像可查看个人资料、登录注册。登录后数据会同步到云端，多设备共享。",
  },
];

export interface OnboardingState {
  /** 是否正在展示引导 */
  active: boolean;
  /** 当前步骤下标 */
  step: number;
  /** 下一步（最后一步则结束） */
  next: () => void;
  /** 跳过 / 结束 */
  skip: () => void;
}

export function useOnboarding(enabled = true): OnboardingState {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    try {
      const done = localStorage.getItem(FLAG_KEY);
      if (!done) setActive(true);
    } catch {
      setActive(true);
    }
  }, [enabled]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(FLAG_KEY, "1");
    } catch {
      /* ignore */
    }
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (step >= ONBOARDING_STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, finish]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  return { active, step, next, skip };
}
