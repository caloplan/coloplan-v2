/**
 * Meals 页数据 Hook。
 *
 * 业务逻辑全部来自 caloplan-core：
 * - 餐食列表：cpCore.meal.listMine()
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
  removeFoodFromMeal: (mealId: string, foodId: string) => Promise<void>;
  changeFoodAmount: (mealId: string, foodId: string, amount: number) => Promise<void>;
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
      const mealsKey = "caloplan_meals";
      const foodKey = "caloplan_food_library";
      const mealsRes = await swrLoad<Meal[]>(mealsKey, () => cpCore.meal.listMine());
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
      const key = `${meal.id}-${food.id}`;
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

  const removeFoodFromMeal = useCallback(
    async (mealId: string, foodId: string) => {
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) return;
      const target = Object.entries(meal.foods).find(([, mf]) => mf.food.id === foodId);
      if (!target) return;
      deleteMealFoodById(meal, target[0]);

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

  const changeFoodAmount = useCallback(
    async (mealId: string, foodId: string, amount: number) => {
      if (amount <= 0) return;
      const meal = meals.find((m) => m.id === mealId);
      if (!meal) return;
      const target = Object.entries(meal.foods).find(([, mf]) => mf.food.id === foodId);
      if (!target) return;
      changeMealFoodAmountById(meal, target[0], amount);

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
    removeFoodFromMeal,
    changeFoodAmount,
  };
}
