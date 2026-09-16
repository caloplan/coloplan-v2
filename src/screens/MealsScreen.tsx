/**
 * Meals — 食物与餐食管理：早/午/晚/加餐，食物条目、营养信息、添加/编辑。
 * 业务逻辑来自 caloplan-core（创建/更新餐食经实体工厂 + 仓储）。
 */
import { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Food, Meal } from "caloplan-core";
import { Screen } from "@/components/Screen";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { MealCard } from "@/components/MealCard";
import { FoodItem } from "@/components/FoodItem";
import { colors, radius, spacing, typography } from "@/theme";
import { useMeals } from "@/hooks/useMeals";

export function MealsScreen() {
  const view = useMeals();
  const [targetMeal, setTargetMeal] = useState<Meal | null>(null);

  const addFood = async (food: Food) => {
    if (!targetMeal) return;
    await view.addFoodToMeal(targetMeal.id, food, 1);
    setTargetMeal(null);
  };

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
        <Text style={styles.title}>Meals</Text>
        {view.isDemo ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>Demo 数据</Text>
          </View>
        ) : null}
      </View>

      {!hasMeals ? (
        <EmptyState title="还没有餐食" hint="从「添加食物」开始记录第一餐" />
      ) : (
        view.groups.map(
          (group) =>
            group.meals.length > 0 && (
              <View key={group.type} style={styles.group}>
                <Text style={styles.groupTitle}>
                  {group.title}
                  <Text style={styles.groupCount}>
                    {"  "}
                    {group.meals.reduce((sum, m) => sum + Object.keys(m.foods).length, 0)} 项食物
                  </Text>
                </Text>
                {group.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    title={group.title}
                    onAddFood={setTargetMeal}
                    onRemoveFood={(m, foodId) => void view.removeFoodFromMeal(m.id, foodId)}
                    onChangeAmount={(m, foodId, amount) =>
                      void view.changeFoodAmount(m.id, foodId, amount)
                    }
                  />
                ))}
              </View>
            ),
        )
      )}

      {/* 添加食物弹层 */}
      <Modal
        visible={targetMeal != null}
        animationType="slide"
        transparent
        onRequestClose={() => setTargetMeal(null)}
      >
        <View style={styles.modalMask}>
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>添加食物</Text>
                <Text style={styles.modalSub}>到「{targetMeal ? mealTypeTitle(targetMeal.type) : ""}」</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetMeal(null)} activeOpacity={0.7}>
                <Text style={styles.close}>关闭</Text>
              </TouchableOpacity>
            </View>

            {view.foodLibraryIsFallback ? (
              <Text style={styles.fallbackNote}>示例食物（当前食物库为空，登录后可管理自有食物）</Text>
            ) : null}

            <FlatList
              data={view.foodLibrary}
              keyExtractor={(f) => f.id}
              style={styles.foodList}
              contentContainerStyle={styles.foodListContent}
              renderItem={({ item }) => (
                <FoodItem
                  mealFood={{ food: item, amount: 1, nutrition: item.nutrition }}
                  onPress={() => void addFood(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListEmptyComponent={<EmptyState title="食物库为空" />}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function mealTypeTitle(type: string): string {
  return { breakfast: "早餐", launch: "午餐", dinner: "晚餐", snack: "加餐" }[type] ?? type;
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
    color: colors.text,
  },
  demoBadge: {
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  demoBadgeText: {
    ...typography.caption,
    color: "#FFFFFF",
  },
  group: { gap: spacing.sm, marginBottom: spacing.xl },
  groupTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "75%",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.section,
    color: colors.text,
  },
  modalSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  close: {
    ...typography.label,
    color: colors.accent,
  },
  fallbackNote: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  foodList: { flexGrow: 0 },
  foodListContent: { paddingBottom: spacing.lg },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
});
