/**
 * 审批确认卡片（AI 页）：展示待确认的工具调用，提供确认 / 取消。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PendingAction } from "caloplan-chat";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";

interface PendingActionCardProps {
  pendingAction: PendingAction;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PendingActionCard({
  pendingAction,
  busy,
  onConfirm,
  onCancel,
}: PendingActionCardProps) {
  const { colors } = useTheme();
  const tool = pendingAction.tools[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <Text style={[styles.title, { color: colors.text }]}>等待你的确认</Text>
      {tool ? (
        <View style={styles.toolRow}>
          <View style={[styles.toolIcon, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.toolIconText, { color: colors.accent }]}>
              {tool.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
            <Text style={[styles.toolDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {tool.description ?? "AI 将执行此操作"}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.surfaceMuted }]}
          onPress={onCancel}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.accent }]}
          onPress={onConfirm}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Text style={[styles.confirmText, { color: colors.textOnAccent }]}>
            {busy ? "处理中…" : "确认执行"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  toolIconText: {
    ...typography.label,
  },
  toolInfo: { flex: 1, gap: 2 },
  toolName: {
    ...typography.body,
  },
  toolDesc: {
    ...typography.caption,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {},
  confirmBtn: {},
  cancelText: {
    ...typography.label,
  },
  confirmText: {
    ...typography.label,
  },
});
