/** 快捷操作按钮（Today 页）。 */
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing, typography } from "@/theme";
import type { QuickActionItem } from "@/demo/demoData";

interface QuickActionProps {
  item: QuickActionItem;
  onPress: (key: string) => void;
}

export function QuickAction({ item, onPress }: QuickActionProps) {
  const isAccent = item.tone === "accent";
  return (
    <TouchableOpacity
      style={[styles.button, isAccent && styles.accent]}
      onPress={() => onPress(item.key)}
      activeOpacity={0.75}
    >
      <Text style={[styles.label, isAccent && styles.accentLabel]}>{item.label}</Text>
      <Text style={[styles.hint, isAccent && styles.accentHint]} numberOfLines={1}>
        {item.hint}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  label: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  accentLabel: {
    color: colors.textOnAccent,
  },
  accentHint: {
    color: "rgba(255,255,255,0.75)",
  },
});
