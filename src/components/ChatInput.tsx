/** 聊天输入条（AI 页）。 */
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme";

interface ChatInputProps {
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
}

export function ChatInput({
  disabled,
  sending,
  placeholder = "问 CaloPlan…",
  onSend,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const canSend = !disabled && !sending && text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
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
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={submit}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>
          {sending ? "…" : "发送"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    ...typography.body,
    color: colors.text,
  },
  sendBtn: {
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  sendText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
  sendTextDisabled: {
    color: colors.textTertiary,
  },
});
