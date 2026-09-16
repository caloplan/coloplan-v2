/**
 * 聊天消息气泡（AI 页）。
 *
 * content 兼容纯文本与内容块数组（text / image_url，多模态 user 消息）：
 * 图片块渲染缩略图（可点击查看原图），文本块与纯文本按气泡渲染；
 * assistant 消息恒为纯文本。
 */
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatMessage as ChatMessageModel, ChatContentBlock } from "caloplan-chat";
import { colors, radius, spacing, typography } from "@/theme";

interface ChatMessageProps {
  message: ChatMessageModel;
}

/** 内容块 imageUrl 兼容 `string | { url: string }` 两种形态，提取可访问 URL */
function blockUrl(block: ChatContentBlock): string | null {
  if (block.type !== "image_url") return null;
  return typeof block.imageUrl === "string" ? block.imageUrl : block.imageUrl.url;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isFailed = message.status === "failed";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const blocks = Array.isArray(message.content) ? message.content : null;
  const text =
    typeof message.content === "string"
      ? message.content
      : message.content
          .filter((b) => b.type === "text")
          .map((b) => (b.type === "text" ? b.text ?? "" : ""))
          .join(" ")
          .trim();

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {blocks != null ? (
          <View style={styles.blocks}>
            {blocks.map((block, i) =>
              block.type === "image_url" ? (
                <Pressable key={i} onPress={() => setPreviewUrl(blockUrl(block))}>
                  {({ pressed }) => (
                    <Image
                      source={{ uri: blockUrl(block) ?? undefined }}
                      style={[styles.inlineImage, pressed && styles.inlineImagePressed]}
                    />
                  )}
                </Pressable>
              ) : null,
            )}
            {text ? (
              <Text style={[styles.text, isUser && styles.textUser]}>
                {text}
                {isStreaming ? <Text style={styles.cursor}>▍</Text> : null}
              </Text>
            ) : isStreaming ? (
              <Text style={[styles.text, isUser && styles.textUser]}>思考中▍</Text>
            ) : null}
          </View>
        ) : text.length > 0 ? (
          <Text style={[styles.text, isUser && styles.textUser]}>
            {text}
            {isStreaming ? <Text style={styles.cursor}>▍</Text> : null}
          </Text>
        ) : isStreaming ? (
          <Text style={[styles.text, isUser && styles.textUser]}>思考中▍</Text>
        ) : (
          <Text style={[styles.text, isUser && styles.textUser]}>（空）</Text>
        )}
      </View>
      {isFailed ? <Text style={styles.failed}>发送失败</Text> : null}

      <Modal visible={previewUrl != null} transparent animationType="fade">
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUrl(null)}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
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
  blocks: {
    gap: spacing.sm,
  },
  inlineImage: {
    width: 168,
    height: 126,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  inlineImagePressed: {
    opacity: 0.8,
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "92%",
    height: "80%",
  },
});
