/**
 * Today — 主落地页：身体数据、营养目标、今日进度、今日餐食、运动与消耗。
 * 回答「我今天状态如何？」（数秒内可读）。
 */
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { NutritionSummary } from "@/components/NutritionSummary";
import { MealSummary } from "@/components/MealSummary";
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
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [exName, setExName] = useState("");
  const [exMin, setExMin] = useState("");
  const [exKcal, setExKcal] = useState("");

  const submitExercise = async () => {
    const durationMin = parseFloat(exMin);
    const kcal = parseFloat(exKcal);
    if (!exName.trim() || !(durationMin > 0) || !(kcal > 0)) return;
    setExerciseOpen(false);
    setExName("");
    setExMin("");
    setExKcal("");
    await view.addExercise({ name: exName.trim(), durationMin, kcal });
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
        <EmptyState title="还没有餐食记录" hint="告诉 AI 今天吃了什么，自动帮你记下来" />
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

      {/* 运动与消耗：记录每日运动与能量消耗（原型阶段本地记录） */}
      <SectionTitle title="运动与消耗" />
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHead}>
          <View>
            <Text style={styles.exerciseTitle}>今日运动</Text>
            <Text style={styles.exerciseMeta}>已消耗 {view.exerciseKcal} kcal</Text>
          </View>
          <TouchableOpacity
            style={styles.exerciseAddBtn}
            onPress={() => setExerciseOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.exerciseAddText}>＋ 记录运动</Text>
          </TouchableOpacity>
        </View>
        {view.exercises.length === 0 ? (
          <Text style={styles.exerciseEmpty}>还没有运动记录，运动后点右上角记录一下</Text>
        ) : (
          <View style={styles.exerciseList}>
            {view.exercises.map((e) => (
              <View key={e.id} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{e.name}</Text>
                <Text style={styles.exerciseDetail}>
                  {e.durationMin} 分钟 · {e.kcal} kcal
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 记录运动弹层 */}
      <Modal
        visible={exerciseOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setExerciseOpen(false)}
      >
        <View style={styles.modalMask}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>记录运动</Text>
            <TextInput
              style={styles.exInput}
              placeholder="运动项目（如：跑步）"
              placeholderTextColor={colors.textTertiary}
              value={exName}
              onChangeText={setExName}
              autoFocus
            />
            <View style={styles.exRow}>
              <TextInput
                style={[styles.exInput, styles.exInputSmall]}
                keyboardType="numeric"
                placeholder="时长（分钟）"
                placeholderTextColor={colors.textTertiary}
                value={exMin}
                onChangeText={setExMin}
              />
              <TextInput
                style={[styles.exInput, styles.exInputSmall]}
                keyboardType="numeric"
                placeholder="消耗（kcal）"
                placeholderTextColor={colors.textTertiary}
                value={exKcal}
                onChangeText={setExKcal}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setExerciseOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnGhostText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => void submitExercise()}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnPrimaryText}>保存</Text>
              </TouchableOpacity>
            </View>
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
  // 运动与消耗卡片
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseTitle: {
    ...typography.section,
    color: colors.text,
  },
  exerciseMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseAddBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseAddText: {
    ...typography.label,
    color: colors.accent,
  },
  exerciseEmpty: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  exerciseList: {
    gap: spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
  },
  exerciseDetail: {
    ...typography.caption,
    color: colors.textSecondary,
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
  exInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.text,
  },
  exRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  exInputSmall: {
    flex: 1,
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
});
