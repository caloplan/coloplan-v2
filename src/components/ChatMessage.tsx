/**
 * 聊天消息气泡（AI 页）。
 *
 * content 兼容纯文本与内容块数组（text / image_url，多模态 user 消息）：
 * 图片块渲染缩略图（可点击查看原图），文本块与纯文本按气泡渲染。
 * assistant 消息使用 react-markdown + remark-gfm 渲染（代码块/列表/加粗等），
 * user 消息恒为纯文本。流式输出时在内容尾部显示光标 ▍。
 */
import { Children, useState } from "react";
import type { ReactNode } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

/** assistant 文本 → Markdown 渲染（映射为 RN 组件，样式对齐气泡配色） */
function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <Text style={styles.mdP}>{children}</Text>,
        h1: ({ children }) => <Text style={styles.mdH1}>{children}</Text>,
        h2: ({ children }) => <Text style={styles.mdH2}>{children}</Text>,
        h3: ({ children }) => <Text style={styles.mdH3}>{children}</Text>,
        strong: ({ children }) => <Text style={styles.mdStrong}>{children}</Text>,
        em: ({ children }) => <Text style={styles.mdEm}>{children}</Text>,
        ul: ({ children }) => <View style={styles.mdList}>{wrapTextNodes(children)}</View>,
        ol: ({ children }) => <View style={styles.mdList}>{wrapTextNodes(children)}</View>,
        li: ({ children }) => (
          <View style={styles.mdLi}>
            <Text style={styles.mdBullet}>•</Text>
            <View style={styles.mdLiContent}>{wrapTextNodes(children)}</View>
          </View>
        ),
        code: ({ children }) => <Text style={styles.mdCode}>{children}</Text>,
        pre: ({ children }) => <View style={styles.mdPre}>{wrapTextNodes(children)}</View>,
        a: ({ children }) => <Text style={styles.mdLink}>{children}</Text>,
        hr: () => <View style={styles.mdHr} />,
        // GFM 表格：table → 边框容器；thead/tbody → 分组；tr → 行；th/td → 等宽单元格
        table: ({ children }) => <View style={styles.mdTable}>{wrapTextNodes(children)}</View>,
        thead: ({ children }) => <View style={styles.mdThead}>{wrapTextNodes(children)}</View>,
        tbody: ({ children }) => <View style={styles.mdTbody}>{wrapTextNodes(children)}</View>,
        tr: ({ children }) => <View style={styles.mdTr}>{wrapTextNodes(children)}</View>,
        th: ({ children }) => <Text style={styles.mdTh}>{wrapTextNodes(children)}</Text>,
        td: ({ children }) => <Text style={styles.mdTd}>{wrapTextNodes(children)}</Text>,
        // 其他 GFM 元素
        blockquote: ({ children }) => (
          <View style={styles.mdBlockquote}>{wrapTextNodes(children)}</View>
        ),
        del: ({ children }) => <Text style={styles.mdDel}>{children}</Text>,
        input: ({ checked }) => (
          <Text style={styles.mdCheckbox}>{checked ? "☑ " : "☐ "}</Text>
        ),
        img: ({ src, alt }) =>
          src ? (
            <Image
              source={{ uri: src }}
              style={styles.mdImg}
              accessibilityLabel={alt ?? undefined}
            />
          ) : null,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/**
 * RN 约束：<View> 不能直接容纳文本节点。Markdown 块级映射里（如 li 的内容）
 * children 可能是裸字符串（"设定…"）或字符串与行内元素混排，统一把文本节点
 * 包进 <Text>，其余元素（嵌套 ul/p 等）原样保留。
 */
function wrapTextNodes(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <Text style={styles.mdText}>{child}</Text>;
    }
    return child;
  });
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

  /** 文本主体：user 纯文本；assistant 走 Markdown（保留流式光标） */
  const renderText = () => {
    if (isUser) {
      return (
        <Text style={[styles.text, styles.textUser]}>
          {text}
          {isStreaming ? <Text style={styles.cursor}>▍</Text> : null}
        </Text>
      );
    }
    if (text.length > 0) {
      return (
        <View>
          <MarkdownText text={text} />
          {isStreaming ? <Text style={styles.cursorDark}>▍</Text> : null}
        </View>
      );
    }
    return (
      <Text style={styles.text}>
        {isStreaming ? "思考中▍" : "（空）"}
      </Text>
    );
  };

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
            {renderText()}
          </View>
        ) : (
          renderText()
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
  cursorDark: {
    color: colors.accent,
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
  // —— Markdown 元素样式（assistant 气泡：浅底深字）——
  mdText: {
    color: colors.chatAssistantText,
  },
  mdP: {
    ...typography.body,
    lineHeight: 22,
    color: colors.chatAssistantText,
    marginBottom: spacing.xs,
  },
  mdH1: {
    ...typography.section,
    color: colors.chatAssistantText,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  mdH2: {
    ...typography.section,
    fontSize: 16,
    color: colors.chatAssistantText,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  mdH3: {
    ...typography.body,
    fontWeight: "600",
    color: colors.chatAssistantText,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  mdStrong: {
    fontWeight: "700",
    color: colors.chatAssistantText,
  },
  mdEm: {
    fontStyle: "italic",
    color: colors.chatAssistantText,
  },
  mdList: {
    backgroundColor: "rgba(0,0,0,0.055)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: 3,
    marginBottom: spacing.sm,
  },
  mdLi: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: 3,
  },
  mdBullet: {
    ...typography.body,
    lineHeight: 22,
    color: colors.accent,
  },
  mdLiContent: {
    flex: 1,
  },
  mdCode: {
    fontFamily: "monospace",
    fontSize: 13,
    color: colors.chatAssistantText,
    backgroundColor: "rgba(0,0,0,0.09)",
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  mdPre: {
    backgroundColor: "rgba(0,0,0,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  mdLink: {
    color: colors.accent,
    textDecorationLine: "underline",
  },
  mdHr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  // —— Markdown 表格 ——
  mdTable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  mdThead: {
    backgroundColor: "#E9E9E5",
  },
  mdTbody: {},
  mdTr: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mdTh: {
    flex: 1,
    ...typography.caption,
    fontWeight: "700",
    color: colors.chatAssistantText,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  mdTd: {
    flex: 1,
    ...typography.caption,
    color: colors.chatAssistantText,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  // —— Markdown 引用 / 删除线 / 任务列表 / 图片 ——
  mdBlockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: "rgba(0,0,0,0.045)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  mdDel: {
    textDecorationLine: "line-through",
    color: colors.chatAssistantText,
  },
  mdCheckbox: {
    color: colors.accent,
    marginRight: 4,
  },
  mdImg: {
    width: 180,
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    marginVertical: spacing.xs,
  },
});
