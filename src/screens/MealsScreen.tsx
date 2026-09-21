/**
 * Meals — 食物与餐食管理：早/午/晚/加餐，食物条目、营养信息。
 * 业务逻辑来自 caloplan-core（读取餐食列表、长按调整份量）。
 *
 * 餐食「创建/加食物」由 AI 完成（AI 页推荐/记录 → 用户确认 → 写入今日记录），
 * 本页不提供手动新建/加餐食入口；空态引导用户去 AI 页让 AI 记餐。
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { MealCard } from "@/components/MealCard";
import { radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { useMeals } from "@/hooks/useMeals";
import type { MainTab } from "@/components/HeaderNavigation";

interface MealsScreenProps {
  onNavigate: (tab: MainTab) => void;
}

export function MealsScreen({ onNavigate }: MealsScreenProps) {
  const view = useMeals();
  const { colors } = useTheme();

  if (view.loading) {
    return (
      <Screen>
        <LoadingState label="正在加载餐食…" />
      </Screen>
    );
  }

  if (view.error) {
    return (
      <Screen>
        <ErrorState message={view.error} onRetry={view.refresh} />
      </Screen>
    );
  }

  const hasMeals = view.groups.some((g) => g.meals.length > 0);

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>Meals</Text>
        {view.isDemo ? (
          <View style={[styles.demoBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.demoBadgeText}>Demo 数据</Text>
          </View>
        ) : null}
      </View>

      {!hasMeals ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="还没有餐食" hint="告诉 AI 今天吃了什么，自动帮你记下来" />
          <TouchableOpacity
            style={[styles.aiBtn, { backgroundColor: colors.accent }]}
            onPress={() => onNavigate("ai")}
            activeOpacity={0.8}
          >
            <Text style={[styles.aiBtnText, { color: colors.textOnAccent }]}>去问 AI</Text>
          </TouchableOpacity>
        </View>
      ) : (
        (() => {
          // 入场动画错峰序号：跨分组连续递增，保证整张列表依次入场
          let cardIndex = 0;
          return view.groups.map(
            (group) =>
              group.meals.length > 0 && (
                <View key={group.type} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.text }]}>
                    {group.title}
                    <Text style={[styles.groupCount, { color: colors.textTertiary }]}>
                      {"  "}
                      {group.meals.reduce((sum, m) => sum + Object.keys(m.foods).length, 0)} 项食物
                    </Text>
                  </Text>
                  {group.meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      title={group.title}
                      index={cardIndex++}
                      editing={view.editingMealId === meal.id}
                      onStartEdit={() => view.startEdit(meal.id)}
                      onSaveEdit={() => void view.saveEdit(meal.id)}
                      onCancelEdit={() => view.cancelEdit(meal.id)}
                      onChangeAmountDraft={(foodId, amount) =>
                        view.changeFoodAmountDraft(meal.id, foodId, amount)
                      }
                    />
                  ))}
                </View>
              ),
          );
        })()
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
  },
  demoBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  demoBadgeText: {
    ...typography.caption,
    color: "#FFFFFF",
  },
  emptyWrap: {
    gap: spacing.lg,
    alignItems: "center",
    paddingTop: spacing.xl,
  },
  aiBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  aiBtnText: {
    ...typography.label,
  },
  group: { gap: spacing.sm, marginBottom: spacing.xl },
  groupTitle: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  groupCount: {
    ...typography.caption,
  },
});
