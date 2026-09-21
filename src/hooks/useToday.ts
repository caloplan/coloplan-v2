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
import { swrLoad, dataCache } from "@/services/cache";
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
} from "@/demo/demoData";

/** 今日运动记录（原型阶段：经 caloplan-cache 持久化到 localStorage） */
export interface ExerciseRecord {
  id: string;
  name: string;
  durationMin: number;
  kcal: number;
  createdAt: number;
}

/** 今日页 SWR 缓存载荷（body + 当日营养目标 + 当日餐食） */
interface TodayCache {
  body: UserBodyProfile | null;
  goal: UserNutritionGoal | null;
  meals: Meal[];
}

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
  exercises: ExerciseRecord[];
  exerciseKcal: number;
  refresh: () => void;
  /** 记录今日体重（真实模式走 caloplan-user body create/update） */
  updateWeight: (weightKg: number) => Promise<void>;
  /** 记录一条今日运动（名称 / 时长分钟 / 消耗 kcal） */
  addExercise: (input: { name: string; durationMin: number; kcal: number }) => Promise<void>;
}

/* ── 运动记录持久化（经 caloplan-cache → localStorage，业务无关缓存） ── */

const EXERCISE_CACHE_KEY = "caloplan_exercise_records";

interface ExerciseStore {
  date: string;
  records: ExerciseRecord[];
}

let exerciseCache: ReturnType<typeof dataCache> | null = null;
let exerciseStore: ExerciseStore = { date: "", records: [] };

function getExerciseCache() {
  if (exerciseCache == null) {
    exerciseCache = dataCache();
    exerciseCache.register(EXERCISE_CACHE_KEY, () => exerciseStore);
  }
  return exerciseCache;
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
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);

  const load = useCallback(async () => {
    if (isDemo) {
      setBody(mockBody);
      setGoal(mockNutritionGoal);
      setMeals(mockMeals);
      setExercises([]);
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
      // SWR：key 固定为 caloplan_today（不带日期），只保留当天视图；
      // 每次进入先渲染缓存，后台 refresh 拉当天数据覆盖，跨天自动更新，不堆积按天 key
      const key = "caloplan_today";
      const res = await swrLoad<TodayCache>(key, async () => {
        const [bodyRes, goalRes, mealsRes] = await Promise.all([
          cpUser.body.getByDate(today),
          cpUser.nutrition.getByDate(today),
          cpCore.meal.listMine({ date: today }),
        ]);
        return { body: bodyRes, goal: goalRes, meals: pickTodayMeals(mealsRes) };
      });
      if (res.cached) {
        // 命中缓存：立即渲染旧数据
        setBody(res.cached.body);
        setGoal(res.cached.goal);
        setMeals(res.cached.meals);
        setLoading(false);
      }
      if (res.fresh) {
        // 后台刷新结果：覆盖渲染
        setBody(res.fresh.body);
        setGoal(res.fresh.goal);
        setMeals(res.fresh.meals);
      }
      // 运动记录：经 cache 读今日数据（跨天自动为空）
      try {
        const store = await getExerciseCache().get<ExerciseStore>(EXERCISE_CACHE_KEY);
        setExercises(store && store.date === today ? store.records : []);
      } catch {
        setExercises([]);
      }
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

  /** 记录一条今日运动：更新内存 + 写回 cache（localStorage） */
  const addExercise = useCallback(
    async (input: { name: string; durationMin: number; kcal: number }) => {
      const name = input.name.trim();
      if (!name || !(input.durationMin > 0) || !(input.kcal > 0)) return;
      const record: ExerciseRecord = {
        id: `ex_${Date.now()}`,
        name,
        durationMin: input.durationMin,
        kcal: input.kcal,
        createdAt: Date.now(),
      };
      const next = [...exercises, record];
      setExercises(next);
      exerciseStore = { date: todayString(), records: next };
      try {
        await getExerciseCache().refresh(EXERCISE_CACHE_KEY);
      } catch {
        // 本地持久化失败不影响本次展示
      }
    },
    [exercises],
  );

  const view = useMemo<TodayViewModel>(() => {
    const consumed = meals.length > 0 ? sumNutrition(meals) : emptyNutrition();
    const calorieConsumed = totalKcal(consumed);
    const calorieTarget = goal?.calorie ?? 2000;
    // UserNutritionGoal 领域模型：carbon/protein/fat 单位为 kg（与 Nutrition 一致），
    // salt 单位为 g。展示层统一为 g，故宏量营养素需 ×1000 转换。
    const macroTargets = {
      carbon: (goal?.carbon ?? 0.25) * 1000,
      protein: (goal?.protein ?? 0.12) * 1000,
      fat: (goal?.fat ?? 0.06) * 1000,
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
      exercises,
      exerciseKcal: exercises.reduce((sum, e) => sum + e.kcal, 0),
      refresh: () => void load(),
      updateWeight,
      addExercise,
    };
  }, [loading, isDemo, error, body, goal, meals, exercises, load, updateWeight, addExercise]);

  return view;
}
