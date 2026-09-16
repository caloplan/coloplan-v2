/**
 * 聊天消息气泡（AI 页）。
 */
import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage as ChatMessageModel } from "caloplan-chat";
import { colors, radius, spacing, typography } from "@/theme";

interface ChatMessageProps {
  message: ChatMessageModel;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isFailed = message.status === "failed";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.content.length > 0 ? (
          <Text style={[styles.text, isUser && styles.textUser]}>
            {message.content}
            {isStreaming ? <Text style={styles.cursor}>▍</Text> : null}
          </Text>
        ) : isStreaming ? (
          <Text style={[styles.text, isUser && styles.textUser]}>思考中▍</Text>
        ) : (
          <Text style={[styles.text, isUser && styles.textUser]}>（空）</Text>
        )}
      </View>
      {isFailed ? <Text style={styles.failed}>发送失败</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: spacing.xs,
    maxWidth: "100%",
  },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "86%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: colors.chatUserBubble,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: colors.chatAssistantBubble,
    borderBottomLeftRadius: radius.sm,
  },
  text: {
    ...typography.body,
    lineHeight: 22,
    color: colors.chatAssistantText,
  },
  textUser: {
    color: colors.chatUserText,
  },
  cursor: {
    color: "rgba(255,255,255,0.9)",
  },
  failed: {
    ...typography.caption,
    color: colors.danger,
    alignSelf: "flex-end",
    marginTop: 2,
  },
});
