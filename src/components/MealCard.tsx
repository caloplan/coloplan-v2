/**
 * 餐食卡片（Meals 页）：一餐内的食物行 + 份量步进器 + 添加/删除。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Meal } from "caloplan-core";
import { colors, radius, spacing, typography } from "@/theme";
import { FoodItem } from "./FoodItem";
import { totalKcal, kcal } from "@/utils/nutrition";

interface MealCardProps {
  meal: Meal;
  /** 本餐类型标题（早餐/午餐/…） */
  title: string;
  onAddFood: (meal: Meal) => void;
  onRemoveFood: (meal: Meal, foodId: string) => void;
  onChangeAmount: (meal: Meal, foodId: string, amount: number) => void;
}

export function MealCard({ meal, title, onAddFood, onRemoveFood, onChangeAmount }: MealCardProps) {
  const foods = Object.values(meal.foods);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {meal.tips ? <Text style={styles.tips} numberOfLines={1}>{meal.tips}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.kcal}>{kcal(totalKcal(meal.nutrition))} kcal</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAddFood(meal)} activeOpacity={0.7}>
            <Text style={styles.addText}>＋ 添加</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      {foods.length === 0 ? (
        <Text style={styles.empty}>还没有食物，点「添加」记录一餐</Text>
      ) : (
        foods.map((mf) => (
          <FoodItem
            key={mf.food.id}
            mealFood={mf}
            actions={
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onChangeAmount(meal, mf.food.id, mf.amount - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.amount}>{mf.amount}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => onChangeAmount(meal, mf.food.id, mf.amount + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepText}>＋</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onRemoveFood(meal, mf.food.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeText}>删除</Text>
                </TouchableOpacity>
              </View>
            }
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerLeft: { flex: 1, gap: 2 },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  tips: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  kcal: {
    ...typography.label,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  addBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  addText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  empty: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    paddingVertical: spacing.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
    lineHeight: 18,
  },
  amount: {
    ...typography.label,
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  removeBtn: {
    marginLeft: spacing.xs,
  },
  removeText: {
    ...typography.caption,
    color: colors.danger,
  },
});
