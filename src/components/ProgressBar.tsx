/** 细进度条（展示层）。 */
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

interface ProgressBarProps {
  /** 0-1 */
  ratio: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  ratio,
  color = colors.accent,
  trackColor = colors.surfaceMuted,
  height = 6,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: color, width: `${clamped * 100}%`, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%" },
});
