/**
 * 数字切换动画：值变化时向左淡出 → 切换 → 从右侧淡入。
 * 与 Today 页营养摄入条（NutritionSummary）使用同一套动态效果。
 */
import { useEffect, useRef, useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Animated } from "react-native";

export function AnimatedNumber({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
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
