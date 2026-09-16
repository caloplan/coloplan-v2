/**
 * 审批确认卡片（AI 页）：展示待确认的工具调用，提供确认 / 取消。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PendingAction } from "caloplan-chat";
import { colors, radius, spacing, typography } from "@/theme";

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
  const tool = pendingAction.tools[0];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>等待你的确认</Text>
      {tool ? (
        <View style={styles.toolRow}>
          <View style={styles.toolIcon}>
            <Text style={styles.toolIconText}>{tool.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDesc} numberOfLines={2}>
              {tool.description ?? "AI 将执行此操作"}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          onPress={onCancel}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.confirmBtn]}
          onPress={onConfirm}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmText}>{busy ? "处理中…" : "确认执行"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
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
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  toolIconText: {
    ...typography.label,
    color: colors.accent,
  },
  toolInfo: { flex: 1, gap: 2 },
  toolName: {
    ...typography.body,
    color: colors.text,
  },
  toolDesc: {
    ...typography.caption,
    color: colors.textSecondary,
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
  cancelBtn: {
    backgroundColor: colors.surfaceMuted,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  cancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  confirmText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
});
