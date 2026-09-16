/**
 * 今日餐食摘要：一餐的标题 + 热量 + 食物概览。
 */
import { StyleSheet, Text, View } from "react-native";
import type { Meal } from "caloplan-core";
import { colors, radius, spacing, typography } from "@/theme";
import { totalKcal, kcal } from "@/utils/nutrition";

interface MealSummaryProps {
  title: string;
  meal: Meal;
  onPress?: () => void;
}

export function MealSummary({ title, meal, onPress }: MealSummaryProps) {
  const foods = Object.values(meal.foods);
  const foodText =
    foods.length > 0
      ? foods.map((f) => `${f.food.name}${f.amount > 1 ? ` ×${f.amount}` : ""}`).join("、")
      : "暂无食物";

  return (
    <View style={styles.card} accessibilityRole={onPress ? "button" : undefined}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.foods} numberOfLines={1}>
            {foodText}
          </Text>
        </View>
        <Text style={styles.kcal}>{kcal(totalKcal(meal.nutrition))} kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  left: { flex: 1, gap: 2 },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  foods: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  kcal: {
    ...typography.label,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
});
