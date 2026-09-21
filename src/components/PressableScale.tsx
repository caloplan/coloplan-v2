/**
 * 带缩放动画的可点击容器（交互动画通用组件）。
 *
 * 按下时缩放至 0.97 并轻微降低不透明度，松开后弹性恢复。
 * 比 TouchableOpacity 的纯透明度变化更有"物理按压"质感。
 * 用于卡片、按钮、列表项等所有可交互区域。
 */
import { useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** 按下时的缩放比例，默认 0.97 */
  pressScale?: number;
  /** 按下时的不透明度，默认 0.85 */
  pressOpacity?: number;
  children: React.ReactNode;
}

export function PressableScale({
  style,
  pressScale = 0.97,
  pressOpacity = 0.85,
  children,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: pressScale,
      useNativeDriver: true,
      friction: 12,
      tension: 200,
    }).start();
    Animated.timing(opacity, {
      toValue: pressOpacity,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 150,
    }).start();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, style]}
    >
      <Animated.View style={[styles.animated, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // 让 Pressable 自身不产生视觉变化，全部由 Animated 子节点处理
  },
  pressed: {
    // 占位：实际视觉由 Animated 处理
  },
  animated: {
    width: "100%",
  },
});
