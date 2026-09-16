/**
 * 营养数值展示工具（仅展示层格式化，不含业务逻辑）。
 */

import type { Nutrition, UnitNumber } from "caloplan-core";

/** UnitNumber → 纯数值（缺失时返回 0） */
export function unitValue(unit?: UnitNumber | null): number {
  return unit?.value ?? 0;
}

/** 千卡展示：四舍五入为整数 */
export function kcal(value: number): string {
  return String(Math.round(value));
}

/** 克展示：保留 1 位小数（去掉多余尾零） */
export function gram(value: number): string {
  if (Math.abs(value) < 0.05) return "0";
  return String(Math.round(value * 10) / 10);
}

/** 公斤展示：保留 2 位小数 */
export function kg(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** 营养总量 → 千卡 */
export function totalKcal(nutrition: Nutrition): number {
  return unitValue(nutrition.energy);
}

/** 营养总量 → 碳水化合物（克，kg → g ×1000） */
export function carbonGram(nutrition: Nutrition): number {
  return unitValue(nutrition.carbon) * 1000;
}

/** 营养总量 → 蛋白质（克） */
export function proteinGram(nutrition: Nutrition): number {
  return unitValue(nutrition.protein) * 1000;
}

/** 营养总量 → 脂肪（克） */
export function fatGram(nutrition: Nutrition): number {
  return unitValue(nutrition.fat) * 1000;
}

/** 营养总量 → 盐（克） */
export function saltGram(nutrition: Nutrition): number {
  return unitValue(nutrition.salt);
}

export interface MacroPoint {
  key: "carbon" | "protein" | "fat" | "salt";
  label: string;
  /** 已摄入（克） */
  consumed: number;
  /** 目标（克） */
  target: number;
  /** 进度 0-1+（展示层封顶 1） */
  ratio: number;
}

/** 由当日摄入 + 目标计算宏量营养进度点 */
export function buildMacroPoints(
  consumed: Nutrition,
  target: { carbon: number; protein: number; fat: number; salt: number },
): MacroPoint[] {
  const points: MacroPoint[] = [
    {
      key: "carbon",
      label: "碳水",
      consumed: carbonGram(consumed),
      target: target.carbon,
      ratio: 0,
    },
    {
      key: "protein",
      label: "蛋白质",
      consumed: proteinGram(consumed),
      target: target.protein,
      ratio: 0,
    },
    {
      key: "fat",
      label: "脂肪",
      consumed: fatGram(consumed),
      target: target.fat,
      ratio: 0,
    },
    {
      key: "salt",
      label: "盐",
      consumed: saltGram(consumed),
      target: target.salt,
      ratio: 0,
    },
  ];
  for (const p of points) {
    p.ratio = p.target > 0 ? Math.min(p.consumed / p.target, 1) : 0;
  }
  return points;
}
