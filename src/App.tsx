/**
 * CaloPlan v2 — React Native (Web) 入口。
 *
 * 导航：Header Navigation（Today / Meals / AI 页签 + 右上 Account）。
 * 不使用 Bottom Tab / Drawer / 额外路由库，保持轻量。
 */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HeaderNavigation } from "@/components/HeaderNavigation";
import type { MainTab } from "@/components/HeaderNavigation";
import { TodayScreen } from "@/screens/TodayScreen";
import { MealsScreen } from "@/screens/MealsScreen";
import { AIScreen } from "@/screens/AIScreen";
import { AccountScreen } from "@/screens/AccountScreen";
import { appServices } from "@/services/bootstrap";
import { useAuth } from "@/hooks/useAuth";
import { colors, spacing, typography } from "@/theme";

export default function App() {
  const [booted, setBooted] = useState(false);
  const [tab, setTab] = useState<MainTab>("today");
  const [accountOpen, setAccountOpen] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    void appServices.boot().finally(() => setBooted(true));
  }, []);

  const accountLabel =
    auth.status === "authenticated" ? auth.profile?.username ?? "U" : "客";

  const navigate = (next: MainTab) => {
    setTab(next);
    setAccountOpen(false);
  };

  let content: ReactNode;
  if (!booted) {
    content = (
      <View style={styles.boot}>
        <Text style={styles.bootText}>CaloPlan 启动中…</Text>
      </View>
    );
  } else if (accountOpen) {
    content = <AccountScreen onBack={() => setAccountOpen(false)} />;
  } else if (tab === "today") {
    content = <TodayScreen onNavigate={navigate} />;
  } else if (tab === "meals") {
    content = <MealsScreen onNavigate={navigate} />;
  } else {
    content = <AIScreen />;
  }

  return (
    <View style={styles.app}>
      <View style={styles.header}>
        <HeaderNavigation
          activeTab={accountOpen ? tab : tab}
          onChangeTab={navigate}
          accountLabel={accountLabel}
          onOpenAccount={() => setAccountOpen(true)}
        />
      </View>
      <View style={styles.content}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg,
    width: "100%",
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  bootText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
