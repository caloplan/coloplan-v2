/**
 * 顶部导航：CaloPlan 标题 + 主题切换 + Account 按钮（右上），下方为 Today / Meals / AI 页签。
 * 不使用底部 Tab / 抽屉等冗余导航。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { layout, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";

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
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.text }]}>CaloPlan</Text>
        <View style={styles.headerRight}>
          {/* 主题切换按钮 */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
          >
            <Text style={[styles.iconText, { color: colors.textSecondary }]}>
              {theme === "dark" ? "☀️" : "🌙"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.accountBtn}
            onPress={onOpenAccount}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.textOnAccent }]}>
                {accountLabel.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.accountText, { color: colors.textSecondary }]}>Account</Text>
          </TouchableOpacity>
        </View>
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
              <Text style={[styles.tabText, { color: active ? colors.text : colors.textTertiary }, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.indicator, active && { backgroundColor: colors.accent }]} />
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
    paddingHorizontal: spacing.lg,
  },
  header: {
    height: layout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    ...typography.title,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 15,
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.label,
    fontSize: 12,
  },
  accountText: {
    ...typography.bodySmall,
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
  },
  tabTextActive: {
    ...typography.bodyStrong,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
});
