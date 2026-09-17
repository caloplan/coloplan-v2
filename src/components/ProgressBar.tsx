/**
 * 细进度条（展示层）。
 *
 * 挂载时宽度从 0 动画增长到目标值，增强数据可视化的动态感。
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface ProgressBarProps {
  /** 0-1 */
  ratio: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** 动画时长（ms），默认 600 */
  duration?: number;
}

export function ProgressBar({
  ratio,
  color,
  trackColor,
  height = 6,
  duration = 600,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const fillColor = color ?? colors.accent;
  const track = trackColor ?? colors.surfaceMuted;
  const clamped = Math.max(0, Math.min(ratio, 1));
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration,
      useNativeDriver: false, // 宽度百分比动画不能用 native driver
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [clamped, duration, widthAnim]);

  return (
    <Animated.View
      style={[styles.track, { backgroundColor: track, height, borderRadius: height / 2 }]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            borderRadius: height / 2,
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%" },
});
