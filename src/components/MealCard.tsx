/**
 * 餐食卡片（Meals 页）：一餐内的食物行 + 编辑模式（长按进入，改完一次保存）。
 *
 * 交互：
 * - 非编辑态：仅展示食物；长按任意食物行进入编辑模式。
 *   手动添加食物已移除——加餐/加食物全权交给 AI。
 * - 编辑态：每行显示份量步进器 + 删除按钮（本地改，不触网）；
 *   顶部显示「完成」「取消」，完成时一次 update 同步所有改动。
 */
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Meal } from "caloplan-core";
import { radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { FoodItem } from "./FoodItem";
import { totalKcal, kcal } from "@/utils/nutrition";

interface MealCardProps {
  meal: Meal;
  /** 本餐类型标题（早餐/午餐/…） */
  title: string;
  /** 是否处于编辑模式 */
  editing: boolean;
  /** 入场动画错峰序号（列表中第几张卡片），默认 0 */
  index?: number;
  /** 长按进入编辑模式 */
  onStartEdit: () => void;
  /** 完成编辑（一次 update） */
  onSaveEdit: () => void;
  /** 取消编辑（回滚） */
  onCancelEdit: () => void;
  /** 编辑态内本地改数量 */
  onChangeAmountDraft: (foodId: string, amount: number) => void;
}

export function MealCard({
  meal,
  title,
  editing,
  index = 0,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeAmountDraft,
}: MealCardProps) {
  const { colors } = useTheme();
  // 用 foods 字典的 key 作为 React key（而非 mf.food.id），避免快照 key 与 food.id 不一致时重复
  const foodEntries = Object.entries(meal.foods);

  // 入场动画：淡入 + 上滑，按 index 错峰（每张延迟 70ms）
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const delay = index * 70;
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(enterTranslateY, {
        toValue: 0,
        delay,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterTranslateY, index]);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        editing && { borderColor: colors.accent, borderWidth: 1.5 },
        { opacity: enterOpacity, transform: [{ translateY: enterTranslateY }] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {meal.tips ? <Text style={[styles.tips, { color: colors.textTertiary }]} numberOfLines={1}>{meal.tips}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.kcal, { color: colors.accent }]}>{kcal(totalKcal(meal.nutrition))} kcal</Text>
          {editing ? (
            <View style={styles.editActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.divider }]} onPress={onCancelEdit} activeOpacity={0.7}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={onSaveEdit} activeOpacity={0.7}>
                <Text style={styles.saveText}>完成</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {editing ? (
        <View style={styles.editHint}>
          <Text style={[styles.editHintText, { color: colors.accent }]}>编辑模式：调整份量或删除，完成后点「完成」保存</Text>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {foodEntries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textTertiary }]}>还没有食物，告诉 AI 今天吃了什么</Text>
      ) : (
        foodEntries.map(([foodKey, mf]) => (
          <FoodItem
            key={foodKey}
            mealFood={mf}
            onLongPress={editing ? undefined : onStartEdit}
            actions={
              editing ? (
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => onChangeAmountDraft(mf.food.id, mf.amount - 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.amount, { color: colors.text }]}>{mf.amount}</Text>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceMuted }]}
                    onPress={() => onChangeAmountDraft(mf.food.id, mf.amount + 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stepText, { color: colors.text }]}>＋</Text>
                  </TouchableOpacity>
                </View>
              ) : undefined
            }
          />
        ))
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  tips: {
    ...typography.caption,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  kcal: {
    ...typography.label,
    fontVariant: ["tabular-nums"],
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
  },
  cancelText: {
    ...typography.label,
    fontSize: 13,
  },
  saveBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  saveText: {
    ...typography.label,
    color: "#FFFFFF",
    fontSize: 13,
  },
  editHint: {
    marginTop: spacing.xs,
  },
  editHintText: {
    ...typography.caption,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  empty: {
    ...typography.bodySmall,
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
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    ...typography.label,
    fontSize: 15,
    lineHeight: 18,
  },
  amount: {
    ...typography.label,
    minWidth: 20,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
