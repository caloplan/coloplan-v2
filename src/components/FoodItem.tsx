/**
 * 食物条目（Meals 页餐食内的食物行 / 添加食物列表复用）。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ReactNode } from "react";
import type { MealFood } from "caloplan-core";
import { colors, radius, spacing, typography } from "@/theme";
import { totalKcal, kcal } from "@/utils/nutrition";

interface FoodItemProps {
  mealFood: MealFood;
  /** 右侧操作区 */
  actions?: ReactNode;
  /** 整行可点（如添加食物列表） */
  onPress?: () => void;
  /** 长按进入编辑模式（Meals 页用） */
  onLongPress?: () => void;
  /** 是否显示份数徽标（添加列表用） */
  showAmountBadge?: boolean;
}

export function FoodItem({ mealFood, actions, onPress, onLongPress, showAmountBadge }: FoodItemProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{mealFood.food.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {mealFood.food.name}
          </Text>
          {showAmountBadge && mealFood.amount > 1 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>×{mealFood.amount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.nutrition}>{kcal(totalKcal(mealFood.nutrition))} kcal</Text>
      </View>
      {actions}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.label,
    color: colors.accent,
  },
  middle: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nutrition: {
    ...typography.caption,
    color: colors.textTertiary,
    fontVariant: ["tabular-nums"],
  },
});
