/**
 * 首次使用引导遮罩。
 *
 * 全屏半透明遮罩 + 顶部附近浮起的说明卡片：
 * - 顶部右侧「跳过」；
 * - 中部：tag 标签 + 标题 + 正文；
 * - 底部：进度圆点 + 下一步/完成按钮。
 *
 * 不依赖真实 DOM 高亮，只做轻量讲解式引导（与项目整体轻量风格一致）。
 */
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCallback, useEffect, useRef } from "react";
import { radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import type { OnboardingStep } from "@/hooks/useOnboarding";

interface OnboardingOverlayProps {
  stepIndex: number;
  steps: OnboardingStep[];
  onNext: () => void;
  onSkip: () => void;
}

const { width: SCREEN_W } = Dimensions.get("window");

export function OnboardingOverlay({ stepIndex, steps, onNext, onSkip }: OnboardingOverlayProps) {
  const { colors } = useTheme();
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // 切步时卡片淡入上滑
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    fade.setValue(0);
    slide.setValue(12);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [stepIndex, fade, slide]);

  const handleNext = useCallback(() => onNext(), [onNext]);

  return (
    <View style={styles.mask} pointerEvents="box-none">
      {/* 跳过 */}
      <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: colors.textOnAccent }]}>跳过 ›</Text>
      </TouchableOpacity>

      {/* 说明卡片：固定在屏幕中上部，避开顶部导航 */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.divider,
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.tagText, { color: colors.accent }]}>{current.tag}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{current.body}</Text>

        {/* 进度圆点 */}
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.divider },
                i === stepIndex && { backgroundColor: colors.accent },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextText, { color: colors.textOnAccent }]}>
            {isLast ? "开始使用 →" : "下一步 →"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.lg,
    justifyContent: "flex-start",
    paddingTop: 110,
  },
  skip: {
    position: "absolute",
    top: 44,
    right: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography.label,
  },
  card: {
    width: Math.min(SCREEN_W - spacing.lg * 2, 420),
    alignSelf: "center",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
    // 抬升
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    ...typography.caption,
  },
  title: {
    ...typography.section,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nextBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  nextText: {
    ...typography.label,
  },
});
