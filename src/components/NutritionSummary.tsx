/**
 * 今日营养概览：热量主数值 + 宏量营养进度。
 * 纯展示组件，数据由页面 Hook 提供。
 *
 * 数值更新时：数字向左淡出 → 切换 → 从右侧淡入；进度条宽度平滑过渡。
 */
import { useEffect, useRef, useState } from "react";
import type { TextStyle } from "react-native";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
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
  carbon: lightColors.macroCarbon,
  protein: lightColors.macroProtein,
  fat: lightColors.macroFat,
  salt: lightColors.macroSalt,
};

/**
 * 数字切换动画：值变化时向左淡出 → 切换值 → 从右侧淡入。
 * 视觉上形成"向左 fade"的切换效果。
 */
function AnimatedNumber({ value, style }: { value: string; style?: TextStyle }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (displayValue === value) return;
    // 向左淡出
    Animated.timing(anim, { toValue: 1, duration: 140, useNativeDriver: true }).start(() => {
      setDisplayValue(value);
      // 从右侧淡入
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    });
  }, [value, displayValue, anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <Animated.Text style={[style, { opacity, transform: [{ translateX }] }]}>
      {displayValue}
    </Animated.Text>
  );
}

export function NutritionSummary({
  calorieConsumed,
  calorieTarget,
  calorieRatio,
  macros,
}: NutritionSummaryProps) {
  const { colors } = useTheme();
  const remaining = Math.max(calorieTarget - calorieConsumed, 0);
  const consumedLabel = kcal(calorieConsumed);
  const targetLabel = kcal(calorieTarget);
  const remainingLabel = remaining > 0 ? ` · 还可摄入 ${kcal(remaining)}` : " · 已超目标";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.calorieRow}>
        <View>
          <AnimatedNumber value={consumedLabel} style={[styles.kcalValue, { color: colors.text }]} />
          <Text style={[styles.kcalCaption, { color: colors.textSecondary }]}>
            已摄入 kcal{remainingLabel}
          </Text>
        </View>
        <View style={styles.targetBox}>
          <AnimatedNumber value={targetLabel} style={[styles.targetValue, { color: colors.text }]} />
          <Text style={[styles.targetCaption, { color: colors.textTertiary }]}>目标</Text>
        </View>
      </View>

      <ProgressBar ratio={calorieRatio} color={colors.accent} height={8} />

      <View style={styles.macroList}>
        {macros.map((m) => {
          const macroLabel = `${gram(m.consumed)} / ${gram(m.target)} g`;
          return (
            <View key={m.key} style={styles.macroRow}>
              <View style={styles.macroHead}>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                <AnimatedNumber value={macroLabel} style={[styles.macroValue, { color: colors.textTertiary }]} />
              </View>
              <ProgressBar ratio={m.ratio} color={MACRO_COLORS[m.key]} height={5} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  kcalCaption: {
    ...typography.caption,
    marginTop: 2,
  },
  targetBox: {
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  targetValue: {
    ...typography.bodyStrong,
  },
  targetCaption: {
    ...typography.caption,
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
  },
  macroValue: {
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
});
