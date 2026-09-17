/**
 * Today — 主落地页：身体数据、营养目标、今日进度、今日餐食、运动与消耗。
 * 回答「我今天状态如何？」（数秒内可读）。
 */
import { useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "@/components/Screen";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { NutritionSummary } from "@/components/NutritionSummary";
import { MealSummary } from "@/components/MealSummary";
import { PressableScale } from "@/components/PressableScale";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
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
  const { colors } = useTheme();
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [exName, setExName] = useState("");
  const [exMin, setExMin] = useState("");
  const [exKcal, setExKcal] = useState("");
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(40)).current;

  const openExerciseModal = () => {
    setExerciseOpen(true);
    Animated.parallel([
      Animated.timing(modalAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, useNativeDriver: true, friction: 10, tension: 120 }),
    ]).start();
  };

  const closeExerciseModal = () => {
    Animated.parallel([
      Animated.timing(modalAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 40, duration: 180, useNativeDriver: true }),
    ]).start(() => setExerciseOpen(false));
  };

  const submitExercise = async () => {
    const durationMin = parseFloat(exMin);
    const kcal = parseFloat(exKcal);
    if (!exName.trim() || !(durationMin > 0) || !(kcal > 0)) return;
    closeExerciseModal();
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
          <Text style={[styles.date, { color: colors.text }]}>{todayLabel()}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>今天状态总览</Text>
        </View>
        {view.isDemo ? <DemoBadge colors={colors} /> : null}
      </View>

      {view.body ? (
        <View style={[styles.bodyChip, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.bodyChipText, { color: colors.text }]}>
            {view.body.height} cm · {view.body.weight} kg · {view.body.age} 岁
          </Text>
          <Text style={[styles.bodyChipMeta, { color: colors.textTertiary }]}>身体数据（来自 caloplan-user）</Text>
        </View>
      ) : (
        <View style={[styles.bodyChip, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.bodyChipText, { color: colors.text }]}>暂无今日身体数据</Text>
        </View>
      )}

      <NutritionSummary
        calorieConsumed={view.calorieConsumed}
        calorieTarget={view.calorieTarget}
        calorieRatio={view.calorieRatio}
        macros={view.macros}
      />

      <SectionTitle title="今日餐食" colors={colors} />
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
      <SectionTitle title="运动与消耗" colors={colors} />
      <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
        <View style={styles.exerciseHead}>
          <View>
            <View style={styles.exerciseTitleRow}>
              <Text style={[styles.exerciseTitle, { color: colors.text }]}>今日运动</Text>
              <View style={styles.todoBadge}>
                <Text style={[styles.todoBadgeText, { color: colors.warning }]}>待开发</Text>
              </View>
            </View>
            <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>已消耗 {view.exerciseKcal} kcal</Text>
          </View>
          <PressableScale
            style={[styles.exerciseAddBtn, { backgroundColor: colors.accentSoft }]}
            onPress={openExerciseModal}
            pressScale={0.94}
          >
            <Text style={[styles.exerciseAddText, { color: colors.accent }]}>＋ 记录运动</Text>
          </PressableScale>
        </View>
        <Text style={[styles.exerciseTodoHint, { backgroundColor: colors.surfaceMuted, color: colors.textTertiary }]}>
          运动记录当前为本地原型，尚未对接 caloplan-core 运动模块
        </Text>
        {view.exercises.length === 0 ? (
          <Text style={[styles.exerciseEmpty, { color: colors.textTertiary }]}>还没有运动记录，运动后点右上角记录一下</Text>
        ) : (
          <View style={styles.exerciseList}>
            {view.exercises.map((e) => (
              <View key={e.id} style={[styles.exerciseRow, { borderBottomColor: colors.divider }]}>
                <Text style={[styles.exerciseName, { color: colors.text }]}>{e.name}</Text>
                <Text style={[styles.exerciseDetail, { color: colors.textSecondary }]}>
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
        transparent
        onRequestClose={closeExerciseModal}
      >
        <Animated.View
          style={[styles.modalMask, { opacity: modalAnim }]}
          onTouchEnd={closeExerciseModal}
        >
          <Animated.View
            style={[
              styles.modal,
              {
                backgroundColor: colors.bg,
                transform: [{ translateY: modalSlide }],
                opacity: modalAnim,
              },
            ]}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>记录运动</Text>
            <Text style={[styles.modalTodoNote, { color: colors.warning }]}>⚠️ 运动模块待开发，当前仅本地原型存储</Text>
            <TextInput
              style={[styles.exInput, { borderColor: colors.divider, color: colors.text }]}
              placeholder="运动项目（如：跑步）"
              placeholderTextColor={colors.textTertiary}
              value={exName}
              onChangeText={setExName}
              autoFocus
            />
            <View style={styles.exRow}>
              <TextInput
                style={[styles.exInput, styles.exInputSmall, { borderColor: colors.divider, color: colors.text }]}
                keyboardType="numeric"
                placeholder="时长（分钟）"
                placeholderTextColor={colors.textTertiary}
                value={exMin}
                onChangeText={setExMin}
              />
              <TextInput
                style={[styles.exInput, styles.exInputSmall, { borderColor: colors.divider, color: colors.text }]}
                keyboardType="numeric"
                placeholder="消耗（kcal）"
                placeholderTextColor={colors.textTertiary}
                value={exKcal}
                onChangeText={setExKcal}
              />
            </View>
            <View style={styles.modalActions}>
              <PressableScale
                style={[styles.modalBtn, styles.modalBtnGhost, { backgroundColor: colors.surfaceMuted }]}
                onPress={closeExerciseModal}
                pressScale={0.95}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.textSecondary }]}>取消</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={() => void submitExercise()}
                pressScale={0.95}
              >
                <Text style={styles.modalBtnPrimaryText}>保存</Text>
              </PressableScale>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </Screen>
  );
}

function DemoBadge({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={[styles.demoBadge, { backgroundColor: colors.warning }]}>
      <Text style={styles.demoBadgeText}>Demo 数据</Text>
    </View>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>;
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
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  demoBadge: {
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
  },
  bodyChipMeta: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.section,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  meals: { gap: spacing.sm },
  // 运动与消耗卡片
  exerciseCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  exerciseTitle: {
    ...typography.section,
  },
  todoBadge: {
    backgroundColor: "rgba(201,138,27,0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  todoBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
  },
  exerciseMeta: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  exerciseTodoHint: {
    ...typography.caption,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  exerciseAddBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseAddText: {
    ...typography.label,
  },
  exerciseEmpty: {
    ...typography.bodySmall,
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
  },
  exerciseName: {
    ...typography.body,
  },
  exerciseDetail: {
    ...typography.caption,
  },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: radius.xl ?? radius.lg,
    borderTopRightRadius: radius.xl ?? radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  modalTodoNote: {
    ...typography.caption,
    backgroundColor: "rgba(201,138,27,0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  modalTitle: {
    ...typography.section,
  },
  exInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
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
  modalBtnGhost: {},
  modalBtnGhostText: {
    ...typography.label,
  },
  modalBtnPrimary: {},
  modalBtnPrimaryText: {
    ...typography.label,
    color: "#FFFFFF",
  },
});
