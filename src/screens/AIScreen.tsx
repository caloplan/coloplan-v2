/**
 * AI — CaloPlan 智能助手界面。
 * 数据流：RN → caloplan-chat → fastapi-chat-service（登录态）；
 * 未登录（Demo）→ DemoChat 适配器（仅原型）。
 * 支持：会话、消息、流式、加载/错误态、待审批确认/取消。
 */
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { colors, layout, radius, spacing, typography } from "@/theme";
import { LoadingState, EmptyState } from "@/components/State";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { PendingActionCard } from "@/components/PendingActionCard";
import { useChat } from "@/hooks/useChat";

export function AIScreen() {
  const chat = useChat();
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chat.activeSession?.messages.length, chat.activeSession?.messages.at(-1)?.content, chat.pendingAction]);

  const handleSend = (text: string) => {
    void chat.send(text);
  };

  return (
    <View style={styles.wrap}>
      {/* 会话条 */}
      <View style={styles.sessionsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionsContent}
        >
          {chat.sessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sessionChip, s.id === chat.activeSessionId && styles.sessionChipActive]}
              onPress={() => chat.selectSession(s.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sessionText,
                  s.id === chat.activeSessionId && styles.sessionTextActive,
                ]}
                numberOfLines={1}
              >
                {s.title || "新会话"}
              </Text>
              <TouchableOpacity
                style={styles.sessionDelete}
                onPress={() => void chat.deleteSession(s.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.sessionDeleteText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.newSessionBtn}
            onPress={() => void chat.createSession()}
            activeOpacity={0.7}
          >
            <Text style={styles.newSessionText}>＋ 新建会话</Text>
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
          <TouchableOpacity style={styles.startBtn} onPress={() => void chat.createSession()} activeOpacity={0.75}>
            <Text style={styles.startBtnText}>新建会话</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      {/* 错误横幅 */}
      {chat.error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText} numberOfLines={2}>
            {chat.error}
          </Text>
          <TouchableOpacity onPress={chat.clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.errorClose}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 输入区 */}
      <View style={styles.inputArea}>
        {chat.isDemo ? (
          <Text style={styles.demoHint}>Demo 会话：登录后可连接真实 caloplan-chat 服务</Text>
        ) : null}
        <ChatInput
          sending={chat.sending}
          disabled={!chat.activeSession}
          onSend={handleSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    backgroundColor: colors.bg,
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
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    maxWidth: 180,
  },
  sessionChipActive: {
    backgroundColor: colors.accent,
  },
  sessionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  sessionTextActive: {
    color: colors.textOnAccent,
  },
  sessionDelete: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDeleteText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  newSessionBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newSessionText: {
    ...typography.label,
    fontSize: 13,
    color: colors.accent,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  startBtnText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
  messages: { flex: 1 },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: "#FBEAE7",
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    flex: 1,
  },
  errorClose: {
    ...typography.label,
    color: colors.danger,
  },
  inputArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  demoHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
