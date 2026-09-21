/**
 * Meals 页数据 Hook。
 *
 * 业务逻辑全部来自 caloplan-core：
 * - 餐食列表：cpCore.meal.listMine({ date: 当天 })，与 Today 页一致只看当天
 * - 添加食物：createMealFood + changeMealFoods + cpCore.meal.update
 * - 删除 / 改份量：deleteMealFoodById / changeMealFoodAmountById + cpCore.meal.update
 *
 * 匿名（demo 模式）时对本地 mock 状态执行相同交互。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Food, Meal, MealType } from "caloplan-core";
import {
  createMealFood,
  changeMealFoods,
  deleteMealFoodById,
  changeMealFoodAmountById,
} from "caloplan-core";
import { useAuth, useIsDemo } from "./useAuth";
import { appServices } from "@/services/bootstrap";
import { swrLoad } from "@/services/cache";
import { mockMeals, mockFoodLibrary } from "@/demo/demoData";
import { todayString } from "@/utils/date";

export interface MealGroup {
  type: MealType;
  title: string;
  meals: Meal[];
}

export interface MealsViewModel {
  loading: boolean;
  isDemo: boolean;
  error: string | null;
  groups: MealGroup[];
  foodLibrary: Food[];
  /** 食物库是否为空（真实库为空时展示示例食物） */
  foodLibraryIsFallback: boolean;
  refresh: () => void;
  addFoodToMeal: (mealId: string, food: Food, amount: number) => Promise<void>;
  /** 编辑模式：当前正在编辑的 meal id（null 表示未进入编辑） */
  editingMealId: string | null;
  startEdit: (mealId: string) => void;
  /** 编辑态内本地改数量（不触网） */
  changeFoodAmountDraft: (mealId: string, foodId: string, amount: number) => void;
  /** 完成编辑：一次 update 同步数量改动 */
  saveEdit: (mealId: string) => Promise<void>;
  /** 取消编辑：回滚本地改动（重新拉取） */
  cancelEdit: (mealId: string) => void;
}

const GROUP_META: { type: MealType; title: string }[] = [
  { type: "breakfast", title: "早餐" },
  { type: "launch", title: "午餐" },
  { type: "dinner", title: "晚餐" },
  { type: "snack", title: "加餐" },
];

function groupMeals(meals: Meal[]): MealGroup[] {
  return GROUP_META.map((meta) => ({
    ...meta,
    meals: meals
      .filter((m) => m.type === meta.type)
      .sort((a, b) => (a.created_time < b.created_time ? 1 : -1)),
  }));
}

export function useMeals(): MealsViewModel {
  const auth = useAuth();
  const isDemo = useIsDemo();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodLibrary, setFoodLibrary] = useState<Food[]>([]);
  const [foodLibraryIsFallback, setFoodLibraryIsFallback] = useState(false);
  /** 编辑模式：当前正在编辑的 meal id */
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isDemo) {
      setMeals(mockMeals);
      setFoodLibrary(mockFoodLibrary);
      setFoodLibraryIsFallback(true);
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
      const cpCore = appServices.requireCPCore();
      // SWR：餐食列表与食物库各自缓存，先渲染旧数据再后台刷新
      // 餐食只看当天（created_time 过滤），缓存 key 按天隔离，避免跨天旧数据残留
      const today = todayString();
      const mealsKey = `caloplan_meals_${today}`;
      const foodKey = "caloplan_food_library";
      const mealsRes = await swrLoad<Meal[]>(mealsKey, () =>
        cpCore.meal.listMine({ date: today }),
      );
      if (mealsRes.cached) {
        setMeals(mealsRes.cached);
        setLoading(false);
      }
      if (mealsRes.fresh) setMeals(mealsRes.fresh);

      const foodRes = await swrLoad<Food[]>(foodKey, () => cpCore.food.listMine());
      if (foodRes.cached) applyFoodLibrary(foodRes.cached);
      if (foodRes.fresh) applyFoodLibrary(foodRes.fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [auth.status, isDemo]);

  /** 应用食物库结果：真实库为空时提供示例食物用于交互演示 */
  const applyFoodLibrary = useCallback((list: Food[]) => {
    if (list.length === 0) {
      setFoodLibrary(mockFoodLibrary);
      setFoodLibraryIsFallback(true);
    } else {
      setFoodLibrary(list);
      setFoodLibraryIsFallback(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 本地更新 meals 状态 */
  const commitMeal = useCallback((updated: Meal) => {
    setMeals((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  const addFoodToMeal = useCallback(
    async (mealId: string, food: Food, amount: number) => {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal || amount <= 0) return;

      const mealFood = createMealFood(food, amount);
      // foods 字典 key 统一用 food.id（与 chat 服务端 create_meal 落库一致），
      // 同一食物重复添加会合并为一条快照，避免 React key 重复与混合 key 污染。
      const key = food.id;
      changeMealFoods(meal, { ...meal.foods, [key]: mealFood });

      if (isDemo) {
        commitMeal({ ...meal, foods: { ...meal.foods }, nutrition: { ...meal.nutrition } });
        return;
      }
      try {
        const saved = await appServices.requireCPCore().meal.update(meal);
        commitMeal(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [meals, isDemo, commitMeal],
  );

  /** 进入某餐的编辑模式 */
  const startEdit = useCallback((mealId: string) => {
    setEditingMealId(mealId);
  }, []);

  /** 编辑态内本地改数量（不触网） */
  const changeFoodAmountDraft = useCallback(
    (mealId: string, foodId: string, amount: number) => {
      if (amount <= 0) return;
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id !== mealId) return m;
          const target = Object.entries(m.foods).find(([, mf]) => mf.food.id === foodId);
          if (!target) return m;
          const newMeal = { ...m, foods: { ...m.foods } };
          changeMealFoodAmountById(newMeal, target[0], amount);
          return newMeal;
        }),
      );
    },
    [],
  );

  /** 完成编辑：一次 update 同步数量改动 */
  const saveEdit = useCallback(
    async (mealId: string) => {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) {
        setEditingMealId(null);
        return;
      }
      try {
        const saved = await appServices.requireCPCore().meal.update(meal);
        commitMeal(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return; // 保留编辑态，让用户重试
      }
      setEditingMealId(null);
    },
    [meals, commitMeal],
  );

  /** 取消编辑：回滚本地改动（重新拉取最新数据） */
  const cancelEdit = useCallback(
    (_mealId: string) => {
      setEditingMealId(null);
      void refresh();
    },
    [refresh],
  );

  const groups = useMemo(() => groupMeals(meals), [meals]);

  return {
    loading,
    isDemo,
    error,
    groups,
    foodLibrary,
    foodLibraryIsFallback,
    refresh,
    addFoodToMeal,
    editingMealId,
    startEdit,
    changeFoodAmountDraft,
    saveEdit,
    cancelEdit,
  };
}
