/** 状态组件：加载 / 错误 / 空态（轻量，无装饰）。 */
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors as lightColors, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";

/* ── LoadingState ── */

export function LoadingState({ label = "加载中…" }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
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
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <Text style={[styles.errorText, { color: colors.danger }]}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accentSoft }]}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryText, { color: colors.accent }]}>重试</Text>
        </TouchableOpacity>
      ) : null}
      {children}
    </View>
  );
}

/* ── EmptyState ── */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {hint ? <Text style={[styles.label, { color: colors.textSecondary }]}>{hint}</Text> : null}
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
    textAlign: "center",
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  retryText: {
    ...typography.label,
  },
  emptyTitle: {
    ...typography.bodyStrong,
  },
});
