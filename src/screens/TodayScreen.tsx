/**
 * Today — 主落地页：身体数据、营养目标、今日进度、今日餐食、快捷操作。
 * 回答「我今天状态如何？」（数秒内可读）。
 */
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { NutritionSummary } from "@/components/NutritionSummary";
import { MealSummary } from "@/components/MealSummary";
import { QuickAction } from "@/components/QuickAction";
import { colors, radius, spacing, typography } from "@/theme";
import { useToday } from "@/hooks/useToday";
import { todayLabel } from "@/utils/date";
import type { MainTab } from "@/components/HeaderNavigation";

const MEAL_TITLES: Record<string, string> = {
  breakfast: "早餐",
  launch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

interface TodayScreenProps {
  onNavigate: (tab: MainTab) => void;
}

export function TodayScreen({ onNavigate }: TodayScreenProps) {
  const view = useToday();
  const [weighOpen, setWeighOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [waterOpen, setWaterOpen] = useState(false);

  const openWeigh = () => {
    setWeightInput(view.body ? String(view.body.weight) : "");
    setWeighOpen(true);
  };

  const submitWeight = async () => {
    const w = parseFloat(weightInput);
    if (!(w > 0)) return;
    setWeighOpen(false);
    await view.updateWeight(w);
  };

  const handleQuickAction = (key: string) => {
    switch (key) {
      case "record":
        onNavigate("meals");
        break;
      case "ask-ai":
        onNavigate("ai");
        break;
      case "weigh":
        openWeigh();
        break;
      case "water":
        setWaterOpen(true);
        break;
    }
  };

  if (view.loading) {
    return (
      <Screen>
        <LoadingState label="正在加载今日数据…" />
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

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <Text style={styles.date}>{todayLabel()}</Text>
          <Text style={styles.subtitle}>今天状态总览</Text>
        </View>
        {view.isDemo ? <DemoBadge /> : null}
      </View>

      {view.body ? (
        <View style={styles.bodyChip}>
          <Text style={styles.bodyChipText}>
            {view.body.height} cm · {view.body.weight} kg · {view.body.age} 岁
          </Text>
          <Text style={styles.bodyChipMeta}>身体数据（来自 caloplan-user）</Text>
        </View>
      ) : (
        <View style={styles.bodyChip}>
          <Text style={styles.bodyChipText}>暂无今日身体数据</Text>
        </View>
      )}

      <NutritionSummary
        calorieConsumed={view.calorieConsumed}
        calorieTarget={view.calorieTarget}
        calorieRatio={view.calorieRatio}
        macros={view.macros}
      />

      <SectionTitle title="今日餐食" />
      {view.meals.length === 0 ? (
        <EmptyState title="还没有餐食记录" hint="去 Meals 页记下今天的第一餐" />
      ) : (
        <View style={styles.meals}>
          {view.meals.map((meal) => (
            <MealSummary
              key={meal.id}
              title={MEAL_TITLES[meal.type] ?? meal.type}
              meal={meal}
              onPress={() => onNavigate("meals")}
            />
          ))}
        </View>
      )}

      <SectionTitle title="快捷操作" />
      <View style={styles.quickGrid}>
        {view.quickActions.map((item) => (
          <QuickAction key={item.key} item={item} onPress={handleQuickAction} />
        ))}
      </View>

      {/* 称体重：输入今日体重 → 写入 caloplan-user body */}
      <Modal
        visible={weighOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWeighOpen(false)}
      >
        <View style={styles.modalMask}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>记录今日体重</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                keyboardType="numeric"
                placeholder="例如 62.5"
                placeholderTextColor={colors.textTertiary}
                value={weightInput}
                onChangeText={setWeightInput}
                autoFocus
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setWeighOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnGhostText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => void submitWeight()}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnPrimaryText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 喝水提醒 */}
      <Modal
        visible={waterOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setWaterOpen(false)}
      >
        <View style={styles.modalMask}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>喝水提醒</Text>
            <Text style={styles.modalBody}>建议每天 8 杯水（约 2L），少量多次饮用。</Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, styles.modalBtnFull]}
              onPress={() => setWaterOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnPrimaryText}>知道了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function DemoBadge() {
  return (
    <View style={styles.demoBadge}>
      <Text style={styles.demoBadgeText}>Demo 数据</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  date: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  demoBadge: {
    backgroundColor: colors.warning,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  demoBadgeText: {
    ...typography.caption,
    color: "#FFFFFF",
  },
  bodyChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bodyChipText: {
    ...typography.body,
    color: colors.text,
  },
  bodyChipMeta: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  meals: { gap: spacing.sm },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modal: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.section,
    color: colors.text,
  },
  modalBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.text,
  },
  weightUnit: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  modalBtnGhost: {
    backgroundColor: colors.surfaceMuted,
  },
  modalBtnGhostText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modalBtnPrimary: {
    backgroundColor: colors.accent,
  },
  modalBtnPrimaryText: {
    ...typography.label,
    color: "#FFFFFF",
  },
  modalBtnFull: {
    alignSelf: "stretch",
    alignItems: "center",
  },
});
