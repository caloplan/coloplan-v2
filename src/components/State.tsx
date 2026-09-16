/** 状态组件：加载 / 错误 / 空态（轻量，无装饰）。 */
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

/* ── LoadingState ── */

export function LoadingState({ label = "加载中…" }: { label?: string }) {
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/* ── ErrorState ── */

export function ErrorState({
  message,
  onRetry,
  children,
}: {
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.box}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      ) : null}
      {children}
    </View>
  );
}

/* ── EmptyState ── */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.label}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  retryText: {
    ...typography.label,
    color: colors.accent,
  },
  emptyTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
});
