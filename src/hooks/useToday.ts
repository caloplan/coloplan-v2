/**
 * Today 页数据 Hook。
 *
 * 数据源切换：
 * - 已登录 → caloplan-user（body / nutrition）+ caloplan-core（meal）
 * - 匿名（demo 模式）→ src/demo 的 mock 数据（UI 原型用，类型与领域模型一致）
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meal, Nutrition } from "caloplan-core";
import type { UserBodyProfile, UserNutritionGoal } from "caloplan-user";
import { useAuth, useIsDemo } from "./useAuth";
import { appServices } from "@/services/bootstrap";
import { todayString } from "@/utils/date";
import {
  buildMacroPoints,
  totalKcal,
  unitValue,
} from "@/utils/nutrition";
import type { MacroPoint } from "@/utils/nutrition";
import {
  mockBody,
  mockNutritionGoal,
  mockMeals,
  mockQuickActions,
} from "@/demo/demoData";
import type { QuickActionItem } from "@/demo/demoData";

export interface TodayViewModel {
  loading: boolean;
  isDemo: boolean;
  error: string | null;
  body: UserBodyProfile | null;
  goal: UserNutritionGoal | null;
  meals: Meal[];
  consumed: Nutrition;
  calorieConsumed: number;
  calorieTarget: number;
  /** 0-1+，展示层封顶 1 */
  calorieRatio: number;
  macros: MacroPoint[];
  quickActions: QuickActionItem[];
  refresh: () => void;
  /** 记录今日体重（真实模式走 caloplan-user body create/update） */
  updateWeight: (weightKg: number) => Promise<void>;
}

function emptyNutrition(): Nutrition {
  return {
    carbon: { unit: "kg", value: 0 },
    protein: { unit: "kg", value: 0 },
    fat: { unit: "kg", value: 0 },
    salt: { unit: "g", value: 0 },
    energy: { unit: "kcal", value: 0 },
  };
}

function sumNutrition(list: { nutrition: Nutrition }[]): Nutrition {
  const total = emptyNutrition();
  for (const item of list) {
    total.carbon.value += unitValue(item.nutrition.carbon);
    total.protein.value += unitValue(item.nutrition.protein);
    total.fat.value += unitValue(item.nutrition.fat);
    total.salt.value += unitValue(item.nutrition.salt);
    total.energy.value += unitValue(item.nutrition.energy);
  }
  return total;
}

/** 取「今天」的餐食；真实数据无 date 字段时回退为最近全部（原型阶段） */
function pickTodayMeals(meals: Meal[]): Meal[] {
  const today = todayString();
  const todayMeals = meals.filter((m) => m.created_time.startsWith(today));
  return todayMeals.length > 0 ? todayMeals : meals;
}

export function useToday(): TodayViewModel {
  const auth = useAuth();
  const isDemo = useIsDemo();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState<UserBodyProfile | null>(null);
  const [goal, setGoal] = useState<UserNutritionGoal | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);

  const load = useCallback(async () => {
    if (isDemo) {
      setBody(mockBody);
      setGoal(mockNutritionGoal);
      setMeals(mockMeals);
      setError(null);
      setLoading(false);
      return;
    }
    if (auth.status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cpUser = appServices.requireCPUser();
      const cpCore = appServices.requireCPCore();
      const today = todayString();
      const [bodyRes, goalRes, mealsRes] = await Promise.all([
        cpUser.body.getByDate(today),
        cpUser.nutrition.getByDate(today),
        cpCore.meal.listMine(),
      ]);
      setBody(bodyRes);
      setGoal(goalRes);
      setMeals(pickTodayMeals(mealsRes));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [auth.status, isDemo]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 记录今日体重：有今日记录则 update，没有则 create（age/height 沿用现有身体数据，缺省 0） */
  const updateWeight = useCallback(
    async (weightKg: number) => {
      if (!(weightKg > 0)) return;
      if (isDemo) {
        setBody((prev) =>
          prev
            ? { ...prev, weight: weightKg }
            : {
                id: "demo",
                user_id: "demo",
                date: todayString(),
                age: 0,
                height: 0,
                weight: weightKg,
                created_time: new Date().toISOString(),
                updated_time: null,
              },
        );
        return;
      }
      if (auth.status !== "authenticated") return;
      try {
        const cpUser = appServices.requireCPUser();
        const today = todayString();
        const existing = await cpUser.body.getByDate(today);
        if (existing) {
          await cpUser.body.update({ id: existing.id, weight: weightKg });
        } else {
          await cpUser.body.create({
            date: today,
            age: body?.age ?? 0,
            height: body?.height ?? 0,
            weight: weightKg,
          });
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [isDemo, auth.status, body, load],
  );

  const view = useMemo<TodayViewModel>(() => {
    const consumed = meals.length > 0 ? sumNutrition(meals) : emptyNutrition();
    const calorieConsumed = totalKcal(consumed);
    const calorieTarget = goal?.calorie ?? 2000;
    const macroTargets = {
      carbon: goal?.carbon ?? 250,
      protein: goal?.protein ?? 120,
      fat: goal?.fat ?? 60,
      salt: goal?.salt ?? 6,
    };
    return {
      loading,
      isDemo,
      error,
      body,
      goal,
      meals,
      consumed,
      calorieConsumed,
      calorieTarget,
      calorieRatio: calorieTarget > 0 ? Math.min(calorieConsumed / calorieTarget, 1) : 0,
      macros: buildMacroPoints(consumed, macroTargets),
      quickActions: mockQuickActions,
      refresh: () => void load(),
      updateWeight,
    };
  }, [loading, isDemo, error, body, goal, meals, load, updateWeight]);

  return view;
}
