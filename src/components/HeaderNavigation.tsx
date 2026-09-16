/**
 * 顶部导航：CaloPlan 标题 + Account 按钮（右上），下方为 Today / Meals / AI 页签。
 * 不使用底部 Tab / 抽屉等冗余导航。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, layout, spacing, typography } from "@/theme";

export type MainTab = "today" | "meals" | "ai";

const TABS: { key: MainTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "meals", label: "Meals" },
  { key: "ai", label: "AI" },
];

interface HeaderNavigationProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  accountLabel: string;
  onOpenAccount: () => void;
}

export function HeaderNavigation({
  activeTab,
  onChangeTab,
  accountLabel,
  onOpenAccount,
}: HeaderNavigationProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.logo}>CaloPlan</Text>
        <TouchableOpacity
          style={styles.accountBtn}
          onPress={onOpenAccount}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{accountLabel.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.accountText}>Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onChangeTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.indicator, active && styles.indicatorActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    height: layout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    ...typography.title,
    color: colors.text,
    letterSpacing: -0.5,
  },
  accountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.label,
    fontSize: 12,
    color: colors.textOnAccent,
  },
  accountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  tab: {
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
    alignItems: "center",
  },
  tabText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  tabTextActive: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: colors.accent,
  },
});
