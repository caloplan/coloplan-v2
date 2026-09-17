/**
 * 今日餐食摘要：一餐的标题 + 热量 + 食物概览。
 * 可点击时带缩放按压动画。
 */
import { StyleSheet, Text, View } from "react-native";
import type { Meal } from "caloplan-core";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { totalKcal, kcal } from "@/utils/nutrition";
import { PressableScale } from "./PressableScale";

interface MealSummaryProps {
  title: string;
  meal: Meal;
  onPress?: () => void;
}

export function MealSummary({ title, meal, onPress }: MealSummaryProps) {
  const { colors } = useTheme();
  const foods = Object.values(meal.foods);
  const foodText =
    foods.length > 0
      ? foods.map((f) => `${f.food.name}${f.amount > 1 ? ` ×${f.amount}` : ""}`).join("、")
      : "暂无食物";

  const inner = (
    <>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.foods, { color: colors.textSecondary }]} numberOfLines={1}>
          {foodText}
        </Text>
      </View>
      <Text style={[styles.kcal, { color: colors.accent }]}>{kcal(totalKcal(meal.nutrition))} kcal</Text>
    </>
  );

  if (onPress) {
    return (
      <PressableScale style={[styles.card, { backgroundColor: colors.surface }]} onPress={onPress} accessibilityRole="button">
        {inner}
      </PressableScale>
    );
  }

  return <View style={[styles.card, { backgroundColor: colors.surface }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  left: { flex: 1, gap: 2 },
  title: {
    ...typography.bodyStrong,
  },
  foods: {
    ...typography.bodySmall,
  },
  kcal: {
    ...typography.label,
    fontVariant: ["tabular-nums"],
  },
});
