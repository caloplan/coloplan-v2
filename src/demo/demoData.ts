/**
 * Demo 模式 mock 数据（仅未登录 / 服务不可达时的 UI 原型数据）。
 *
 * 约定：
 * - 数据类型与 caloplan-core / caloplan-user 领域模型完全一致，
 *   登录后 UI 用同一套渲染代码消费真实模块数据；
 * - 仅存在于本文件，不进入任何 caloplan-* 模块；
 * - 所有数据标有 "mock" 语义，页面会提示「Demo 数据」。
 */
import type { Meal, MealFood, Nutrition, Food, MealType } from "caloplan-core";
import type { UserBodyProfile, UserNutritionGoal } from "caloplan-user";
import { todayString } from "@/utils/date";

/* ── 食物与营养 ── */

function food(id: string, name: string, energy: number, carbon: number, protein: number, fat: number, salt: number): Food {
  return {
    id,
    user_id: "mock-user",
    name,
    image: "",
    unit: { unit: "份", value: 1 },
    nutrition: {
      carbon: { unit: "kg", value: carbon / 1000 },
      protein: { unit: "kg", value: protein / 1000 },
      fat: { unit: "kg", value: fat / 1000 },
      salt: { unit: "g", value: salt },
      energy: { unit: "kcal", value: energy },
    },
    created_time: new Date().toISOString(),
  };
}

const MOCK_FOODS: Record<string, Food> = {
  oats: food("f-oats", "燕麦粥", 168, 28, 6, 3, 0.2),
  egg: food("f-egg", "水煮蛋", 78, 0.6, 6, 5, 0.1),
  milk: food("f-milk", "牛奶 250ml", 120, 9, 8, 5, 0.2),
  rice: food("f-rice", "米饭", 232, 50, 4, 0.5, 0.05),
  chicken: food("f-chicken", "鸡胸肉", 165, 0, 31, 3.6, 0.2),
  broccoli: food("f-broccoli", "西兰花", 34, 7, 2.8, 0.4, 0.05),
  salmon: food("f-salmon", "三文鱼", 208, 0, 20, 13, 0.3),
  quinoa: food("f-quinoa", "藜麦饭", 222, 39, 8, 4, 0.1),
  salad: food("f-salad", "蔬菜沙拉", 45, 8, 2, 1.5, 0.15),
  apple: food("f-apple", "苹果", 52, 14, 0.3, 0.2, 0.01),
  nuts: food("f-nuts", "混合坚果 25g", 142, 5, 4, 12, 0.05),
};

/** 按食物与份数生成 MealFood（模拟 caloplan-core createMealFood 的数值） */
function mealFoodOf(key: keyof typeof MOCK_FOODS, amount: number, portionKcal?: number): MealFood {
  const f = MOCK_FOODS[key];
  const scale = amount;
  return {
    food: f,
    amount,
    nutrition: {
      carbon: { unit: "kg", value: f.nutrition.carbon.value * scale },
      protein: { unit: "kg", value: f.nutrition.protein.value * scale },
      fat: { unit: "kg", value: f.nutrition.fat.value * scale },
      salt: { unit: "g", value: f.nutrition.salt.value * scale },
      energy: { unit: "kcal", value: portionKcal ?? f.nutrition.energy.value * scale },
    },
  };
}

function meal(id: string, type: MealType, foods: ReturnType<typeof mealFoodOf>[], tips: string): Meal {
  const nutrition: Nutrition = {
    carbon: { unit: "kg", value: 0 },
    protein: { unit: "kg", value: 0 },
    fat: { unit: "kg", value: 0 },
    salt: { unit: "g", value: 0 },
    energy: { unit: "kcal", value: 0 },
  };
  const record: Meal["foods"] = {};
  for (const mf of foods) {
    nutrition.carbon.value += mf.nutrition.carbon.value;
    nutrition.protein.value += mf.nutrition.protein.value;
    nutrition.fat.value += mf.nutrition.fat.value;
    nutrition.salt.value += mf.nutrition.salt.value;
    nutrition.energy.value += mf.nutrition.energy.value;
    record[`${id}-${mf.food.id}`] = mf;
  }
  return {
    id,
    user_id: "mock-user",
    type,
    tips,
    foods: record,
    nutrition,
    created_time: new Date().toISOString(),
  };
}

/* ── 今日身体与目标 ── */

export const mockBody: UserBodyProfile = {
  id: "body-mock",
  user_id: "mock-user",
  date: todayString(),
  age: 28,
  height: 175,
  weight: 70,
  created_time: new Date().toISOString(),
  updated_time: null,
};

export const mockNutritionGoal: UserNutritionGoal = {
  id: "goal-mock",
  user_id: "mock-user",
  date: todayString(),
  carbon: 250,
  protein: 120,
  fat: 60,
  salt: 6,
  calorie: 2000,
  created_time: new Date().toISOString(),
  updated_time: null,
};

/* ── 今日餐食 ── */

export const mockMeals: Meal[] = [
  meal("meal-breakfast", "breakfast", [
    mealFoodOf("oats", 1),
    mealFoodOf("egg", 1),
    mealFoodOf("milk", 1),
  ], "早上 08:15 记录"),
  meal("meal-lunch", "launch", [
    mealFoodOf("rice", 1),
    mealFoodOf("chicken", 1),
    mealFoodOf("broccoli", 1),
  ], "中午 12:30 记录"),
  meal("meal-dinner", "dinner", [
    mealFoodOf("salmon", 1),
    mealFoodOf("quinoa", 1),
    mealFoodOf("salad", 1),
  ], "晚上 19:00 记录"),
  meal("meal-snack", "snack", [
    mealFoodOf("apple", 1),
    mealFoodOf("nuts", 1),
  ], "下午 15:40 记录"),
];

/* ── 我的食物库（Meals 页添加食物用） ── */

export const mockFoodLibrary: Food[] = Object.values(MOCK_FOODS);

/* ── 快捷操作 ── */

export interface QuickActionItem {
  key: string;
  label: string;
  hint: string;
  tone: "accent" | "neutral";
}

export const mockQuickActions: QuickActionItem[] = [
  { key: "record", label: "记一餐", hint: "快速记录", tone: "accent" },
  { key: "weigh", label: "称体重", hint: "更新身体数据", tone: "neutral" },
  { key: "water", label: "喝水提醒", hint: "8 杯 / 天", tone: "neutral" },
  { key: "ask-ai", label: "问 AI", hint: "营养建议", tone: "neutral" },
];

/* ── 汇总：已摄入营养 ── */

export function mockConsumedNutrition(): Nutrition {
  const nutrition: Nutrition = {
    carbon: { unit: "kg", value: 0 },
    protein: { unit: "kg", value: 0 },
    fat: { unit: "kg", value: 0 },
    salt: { unit: "g", value: 0 },
    energy: { unit: "kcal", value: 0 },
  };
  for (const m of mockMeals) {
    nutrition.carbon.value += m.nutrition.carbon.value;
    nutrition.protein.value += m.nutrition.protein.value;
    nutrition.fat.value += m.nutrition.fat.value;
    nutrition.salt.value += m.nutrition.salt.value;
    nutrition.energy.value += m.nutrition.energy.value;
  }
  return nutrition;
}

/* ── Demo 聊天（静态开场白） ── */

export interface DemoChatSeed {
  id: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export const mockChatSeeds: DemoChatSeed[] = [
  {
    id: "demo-session-1",
    title: "帮我看看今天的营养摄入",
    messages: [
      {
        role: "user",
        content: "帮我看看今天的营养摄入，蛋白质够不够？",
      },
      {
        role: "assistant",
        content:
          "从你今天的记录来看：\n\n· 热量约 1290 kcal / 目标 2000 kcal\n· 蛋白质约 87g / 目标 120g\n\n蛋白质目前只达到 72%，建议晚餐或加餐补充一份鸡胸肉或一杯酸奶。需要我帮你调整一餐吗？",
      },
      {
        role: "user",
        content: "帮我规划一顿 30 分钟能做完的高蛋白晚餐",
      },
      {
        role: "assistant",
        content:
          "推荐：香煎鸡胸肉 150g + 藜麦饭 100g + 烫西兰花 100g。\n\n· 热量约 380 kcal\n· 蛋白质约 45g\n\n做法：鸡胸肉用盐和黑胡椒腌 10 分钟，中火每面煎 4-5 分钟即可。要我把这餐加入今晚的记录吗？",
      },
    ],
  },
  {
    id: "demo-session-2",
    title: "减脂期怎么吃碳水",
    messages: [
      {
        role: "user",
        content: "减脂期碳水应该吃多少？",
      },
      {
        role: "assistant",
        content:
          "减脂期碳水一般建议每公斤体重 2-3g（你 70kg 约 140-210g/天）。优先选燕麦、糙米、薯类这类低 GI 主食，训练日可适当上调。需要我按你的目标重新算一份全天食谱吗？",
      },
    ],
  },
];
