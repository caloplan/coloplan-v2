/**
 * CaloPlan v2 — React Native (Web) 入口。
 *
 * 导航：Header Navigation（Today / Meals / AI 页签 + 右上 Account）。
 * 不使用 Bottom Tab / Drawer / 额外路由库，保持轻量。
 */
import { Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HeaderNavigation } from "@/components/HeaderNavigation";
import type { MainTab } from "@/components/HeaderNavigation";
import { TodayScreen } from "@/screens/TodayScreen";
import { appServices } from "@/services/bootstrap";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme";
import { useOnboarding, ONBOARDING_STEPS } from "@/hooks/useOnboarding";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

/**
 * 非首屏页面懒加载（代码分包）：Meals / AI / Account 在首次进入对应页面时才加载，
 * 首屏（Today）只加载 TodayScreen 及其依赖，减小首屏 bundle。
 */
const MealsScreen = lazy(() =>
  import("@/screens/MealsScreen").then((m) => ({ default: m.MealsScreen })),
);
const AIScreen = lazy(() =>
  import("@/screens/AIScreen").then((m) => ({ default: m.AIScreen })),
);
const AccountScreen = lazy(() =>
  import("@/screens/AccountScreen").then((m) => ({ default: m.AccountScreen })),
);

function AppInner() {
  const [booted, setBooted] = useState(false);
  const [tab, setTab] = useState<MainTab>("today");
  const [accountOpen, setAccountOpen] = useState(false);
  const auth = useAuth();
  const { colors } = useTheme();
  const onboarding = useOnboarding(auth.status === "authenticated");

  useEffect(() => {
    void appServices.boot().finally(() => setBooted(true));
  }, []);

  // 引导进行中：每步自动切到对应 tab，让用户看到被讲解的页面
  useEffect(() => {
    if (!onboarding.active) return;
    const step = ONBOARDING_STEPS[onboarding.step];
    setAccountOpen(false);
    setTab(step.tab);
  }, [onboarding.active, onboarding.step]);

  const accountLabel =
    auth.status === "authenticated"
      ? (auth.profile?.full_name?.trim() || auth.profile?.username || "U")
      : "客";

  const navigate = (next: MainTab) => {
    setTab(next);
    setAccountOpen(false);
  };

  let content: ReactNode;
  if (!booted) {
    content = (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <Text style={[styles.bootText, { color: colors.textSecondary }]}>CaloPlan 启动中…</Text>
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
    <View style={[styles.app, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider, backgroundColor: colors.bg }]}>
        <HeaderNavigation
          activeTab={tab}
          onChangeTab={navigate}
          accountLabel={accountLabel}
          onOpenAccount={() => setAccountOpen(true)}
        />
      </View>
      <View style={styles.content}>
        <Suspense fallback={<PageLoading colors={colors} />}>{content}</Suspense>
      </View>
      {onboarding.active ? (
        <OnboardingOverlay
          stepIndex={onboarding.step}
          steps={ONBOARDING_STEPS}
          onNext={onboarding.next}
          onSkip={onboarding.skip}
        />
      ) : null}
    </View>
  );
}

/** 懒加载页面的轻量加载态 */
function PageLoading({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.boot}>
      <Text style={[styles.bootText, { color: colors.textSecondary }]}>加载中…</Text>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    width: "100%",
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    // 刘海 / 状态栏安全区：viewport-fit=cover 下内容不顶到顶部状态栏
    paddingTop: "env(safe-area-inset-top)",
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
  },
});
