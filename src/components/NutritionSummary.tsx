/**
 * 今日营养概览：热量主数值 + 宏量营养进度。
 * 纯展示组件，数据由页面 Hook 提供。
 */
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme";
import { ProgressBar } from "./ProgressBar";
import type { MacroPoint } from "@/utils/nutrition";
import { kcal, gram } from "@/utils/nutrition";

interface NutritionSummaryProps {
  calorieConsumed: number;
  calorieTarget: number;
  calorieRatio: number;
  macros: MacroPoint[];
}

const MACRO_COLORS: Record<MacroPoint["key"], string> = {
  carbon: colors.macroCarbon,
  protein: colors.macroProtein,
  fat: colors.macroFat,
  salt: colors.macroSalt,
};

export function NutritionSummary({
  calorieConsumed,
  calorieTarget,
  calorieRatio,
  macros,
}: NutritionSummaryProps) {
  const remaining = Math.max(calorieTarget - calorieConsumed, 0);
  return (
    <View style={styles.card}>
      <View style={styles.calorieRow}>
        <View>
          <Text style={styles.kcalValue}>{kcal(calorieConsumed)}</Text>
          <Text style={styles.kcalCaption}>
            已摄入 kcal
            {remaining > 0 ? ` · 还可摄入 ${kcal(remaining)}` : " · 已超目标"}
          </Text>
        </View>
        <View style={styles.targetBox}>
          <Text style={styles.targetValue}>{kcal(calorieTarget)}</Text>
          <Text style={styles.targetCaption}>目标</Text>
        </View>
      </View>

      <ProgressBar ratio={calorieRatio} color={colors.accent} height={8} />

      <View style={styles.macroList}>
        {macros.map((m) => (
          <View key={m.key} style={styles.macroRow}>
            <View style={styles.macroHead}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <Text style={styles.macroValue}>
                {gram(m.consumed)} / {gram(m.target)} g
              </Text>
            </View>
            <ProgressBar ratio={m.ratio} color={MACRO_COLORS[m.key]} height={5} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  kcalValue: {
    ...typography.display,
    color: colors.text,
  },
  kcalCaption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  targetBox: {
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  targetValue: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  targetCaption: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  macroList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  macroRow: {
    gap: spacing.xs,
  },
  macroHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  macroValue: {
    ...typography.caption,
    color: colors.textTertiary,
    fontVariant: ["tabular-nums"],
  },
});
