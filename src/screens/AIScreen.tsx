/**
 * AI — CaloPlan 智能助手界面。
 * 数据流：RN → caloplan-chat → fastapi-chat-service（登录态）；
 * 未登录（Demo）→ DemoChat 适配器（仅原型）。
 * 支持：会话、消息、流式、加载/错误态、待审批确认/取消。
 */
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import type { ChatContentBlock } from "caloplan-chat";
import { layout, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";
import { LoadingState, EmptyState } from "@/components/State";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { PendingActionCard } from "@/components/PendingActionCard";
import { useChat } from "@/hooks/useChat";
import { appServices } from "@/services/bootstrap";
import { env } from "@/services/env";
import { uploadImage } from "@/services/upload";
import { DEMO_IMAGE_URL } from "@/demo/demoData";

export function AIScreen() {
  const chat = useChat();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const listOpacity = useRef(new Animated.Value(1)).current;
  const prevSessionId = useRef<string | null>(chat.activeSessionId);

  // 切换会话时消息列表淡入淡出
  useEffect(() => {
    if (prevSessionId.current === chat.activeSessionId) return;
    prevSessionId.current = chat.activeSessionId;
    Animated.sequence([
      Animated.timing(listOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(listOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [chat.activeSessionId, listOpacity]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chat.activeSession?.messages.length, chat.activeSession?.messages.at(-1)?.content, chat.pendingAction]);

  const handleSend = (content: string | ChatContentBlock[]) => {
    void chat.send(content);
  };

  /** 图片上传：登录态直连 fastapi-file-service；Demo 模式模拟（不进入真实链路） */
  const handleUploadImage = async (file: File): Promise<string> => {
    if (chat.isDemo) {
      await new Promise((r) => setTimeout(r, 500));
      return DEMO_IMAGE_URL;
    }
    const token = appServices.getAccessToken();
    if (!token) throw new Error("未登录，无法上传图片");
    return uploadImage(file, { baseURL: env.fileUrl, token });
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      {/* 会话条 */}
      <View style={styles.sessionsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionsContent}
        >
          {chat.sessions.map((s, index) => {
            const active = s.id === chat.activeSessionId;
            return (
              <AnimatedChip key={s.id} delay={index * 30} active={active}>
                <TouchableOpacity
                  style={[styles.sessionChip, { backgroundColor: active ? colors.accent : colors.surface }]}
                  onPress={() => chat.selectSession(s.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.sessionText, { color: active ? colors.textOnAccent : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {s.title || "新会话"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.sessionDelete, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.surfaceMuted }]}
                    onPress={() => void chat.deleteSession(s.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.sessionDeleteText, { color: active ? colors.textOnAccent : colors.textSecondary }]}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </AnimatedChip>
            );
          })}
          <TouchableOpacity
            style={[styles.newSessionBtn, { backgroundColor: colors.accentSoft }]}
            onPress={() => void chat.createSession()}
            activeOpacity={0.7}
          >
            <Text style={[styles.newSessionText, { color: colors.accent }]}>＋ 新建会话</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 消息区 */}
      {chat.initLoading ? (
        <View style={styles.center}>
          <LoadingState label="正在恢复会话…" />
        </View>
      ) : !chat.activeSession ? (
        <View style={styles.center}>
          <EmptyState title="开始一段新对话" hint="新建会话，向 CaloPlan 询问营养与饮食建议" />
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.accent }]}
            onPress={() => void chat.createSession()}
            activeOpacity={0.75}
          >
            <Text style={[styles.startBtnText, { color: colors.textOnAccent }]}>新建会话</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View
          style={[styles.messagesWrapper, { opacity: listOpacity }]}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          >
            {chat.activeSession.messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}

            {chat.pendingAction ? (
              <PendingActionCard
                pendingAction={chat.pendingAction}
                busy={chat.sending}
                onConfirm={() => void chat.confirm()}
                onCancel={() => void chat.cancel()}
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      )}

      {/* 错误横幅 */}
      {chat.error ? (
        <View style={[styles.errorBar, { backgroundColor: colors.danger + "22" }]}>
          <Text style={[styles.errorText, { color: colors.danger }]} numberOfLines={2}>
            {chat.error}
          </Text>
          <TouchableOpacity onPress={chat.clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.errorClose, { color: colors.danger }]}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 输入区 */}
      <View style={styles.inputArea}>
        {chat.isDemo ? (
          <Text style={[styles.demoHint, { color: colors.textTertiary }]}>Demo 会话：登录后可连接真实 caloplan-chat 服务</Text>
        ) : null}
        <ChatInput
          sending={chat.sending}
          disabled={!chat.activeSession}
          uploadImage={handleUploadImage}
          onSend={handleSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
  },
  sessionsBar: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sessionsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  sessionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    maxWidth: 180,
  },
  sessionText: {
    ...typography.bodySmall,
    maxWidth: 120,
  },
  sessionDelete: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDeleteText: {
    ...typography.caption,
    lineHeight: 16,
  },
  newSessionBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newSessionText: {
    ...typography.label,
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  startBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  startBtnText: {
    ...typography.label,
  },
  messages: { flex: 1, minHeight: 0 },
  messagesWrapper: { flex: 1, minHeight: 0 },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    flex: 1,
  },
  errorClose: {
    ...typography.label,
  },
  inputArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  demoHint: {
    ...typography.caption,
    textAlign: "center",
  },
});

/**
 * 会话 chip 动画：
 * - 入场：挂载时淡入 + 轻微缩放弹入（初始加载按 index 依次淡入）
 * - 选中：active 时轻微放大弹入，切换会话时有明显的选中反馈
 */
function AnimatedChip({ children, delay = 0, active = false }: { children: React.ReactNode; delay?: number; active?: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const enterScale = useRef(new Animated.Value(0.88)).current;
  const activeScale = useRef(new Animated.Value(active ? 1.04 : 1)).current;

  // 入场动画
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay, useNativeDriver: true }),
      Animated.spring(enterScale, { toValue: 1, friction: 7, tension: 180, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, enterScale, delay]);

  // active 切换动画
  useEffect(() => {
    Animated.spring(activeScale, {
      toValue: active ? 1.04 : 1,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [active, activeScale]);

  const combinedScale = Animated.multiply(enterScale, activeScale);

  return (
    <Animated.View style={{ opacity, transform: [{ scale: combinedScale }] }}>
      {children}
    </Animated.View>
  );
}
