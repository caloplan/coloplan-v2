/**
 * 聊天输入条（AI 页）。
 *
 * 支持附加图片：选图 → 上传（fastapi-file-service）→ 预览缩略图 → 发送时
 * 组装成 caloplan-chat 内容块数组（text + image_url），交由 useChat.send 发送。
 * 未传入 uploadImage（如非 Web 环境）时仅显示文本输入。
 */
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { ChatContentBlock } from "caloplan-chat";
import { colors as lightColors, radius, spacing, typography } from "@/theme";
import { useTheme } from "@/theme/ThemeProvider";

interface ChatInputProps {
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  /** 上传回调：入参为选中的图片文件，返回可公开访问的 url；不传则隐藏图片按钮 */
  uploadImage?: (file: File) => Promise<string>;
  onSend: (content: string | ChatContentBlock[]) => void;
}

export function ChatInput({
  disabled,
  sending,
  placeholder = "问 CaloPlan…",
  uploadImage,
  onSend,
}: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasImageSupport = typeof uploadImage === "function";
  const canSend =
    !disabled && !sending && !uploading && (text.trim().length > 0 || images.length > 0);

  /* 懒挂载隐藏文件选择框（RN Web：input 不进入 RN 组件树） */
  useEffect(() => {
    if (!hasImageSupport || typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.style.display = "none";
    input.addEventListener("change", handleFileChange);
    document.body.appendChild(input);
    fileInputRef.current = input;
    return () => {
      input.removeEventListener("change", handleFileChange);
      input.remove();
      fileInputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImageSupport]);

  const handleFileChange = async (ev: Event) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file || !uploadImage) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const pickImage = () => {
    if (!hasImageSupport || uploading) return;
    fileInputRef.current?.click();
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const submit = () => {
    if (!canSend) return;
    if (images.length > 0) {
      const blocks: ChatContentBlock[] = [
        ...(text.trim()
          ? [{ type: "text" as const, text: text.trim() }]
          : []),
        ...images.map((url) => ({ type: "image_url" as const, imageUrl: url })),
      ];
      onSend(blocks);
    } else {
      onSend(text);
    }
    setText("");
    setImages([]);
    setUploadError(null);
  };

  return (
    <View style={styles.wrap}>
      {images.length > 0 || uploading ? (
        <View style={styles.thumbRow}>
          {images.map((url) => (
            <View key={url} style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}>
              <Image source={{ uri: url }} style={styles.thumbImage} />
              <TouchableOpacity
                style={styles.thumbRemove}
                onPress={() => removeImage(url)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.thumbRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {uploading ? (
            <View style={[styles.thumb, styles.thumbUploading, { backgroundColor: colors.surfaceMuted }]}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
            </View>
          ) : null}
        </View>
      ) : null}
      {uploadError ? <Text style={[styles.uploadError, { color: colors.danger }]}>{uploadError}</Text> : null}

      <View style={styles.inputRow}>
        {hasImageSupport ? (
          <TouchableOpacity
            style={[styles.imageBtn, uploading && styles.imageBtnDisabled, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickImage}
            disabled={!hasImageSupport || uploading}
            activeOpacity={0.7}
          >
            <Text style={[styles.imageBtnText, { color: colors.textSecondary }]}>＋</Text>
          </TouchableOpacity>
        ) : null}
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={2000}
          editable={!disabled && !sending}
          onSubmitEditing={submit}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && { backgroundColor: colors.surfaceMuted }, canSend && { backgroundColor: colors.accent }]}
          onPress={submit}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Text style={[styles.sendText, !canSend && { color: colors.textTertiary }, canSend && { color: colors.textOnAccent }]}>
            {sending ? "…" : "发送"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  thumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  thumbUploading: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRemoveText: {
    ...typography.caption,
    color: "#fff",
    lineHeight: 14,
  },
  uploadError: {
    ...typography.caption,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  imageBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageBtnDisabled: {
    opacity: 0.5,
  },
  imageBtnText: {
    ...typography.label,
    fontSize: 20,
    lineHeight: 22,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    ...typography.body,
  },
  sendBtn: {
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    ...typography.label,
  },
});
