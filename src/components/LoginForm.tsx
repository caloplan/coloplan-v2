/**
 * 登录 / 注册表单（Account 页）。
 * 服务地址默认取 env，可展开修改（连接远程服务 / 本地服务）。
 */
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, radius, spacing, typography } from "@/theme";
import { env } from "@/services/env";

export interface LoginFields {
  username: string;
  password: string;
  email: string;
  userUrl: string;
  metaUrl: string;
  chatUrl: string;
}

interface LoginFormProps {
  busy?: boolean;
  error?: string | null;
  onSubmit: (mode: "login" | "register", fields: LoginFields) => void;
}

export function LoginForm({ busy, error, onSubmit }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [userUrl, setUserUrl] = useState(env.userUrl);
  const [metaUrl, setMetaUrl] = useState(env.metaUrl);
  const [chatUrl, setChatUrl] = useState(env.chatUrl);
  const [showUrls, setShowUrls] = useState(false);

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (mode === "login" || email.trim().length > 0);

  const submit = () => {
    if (!canSubmit || busy) return;
    onSubmit(mode, { username: username.trim(), password, email: email.trim(), userUrl, metaUrl, chatUrl });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <View style={styles.modeRow}>
          {(["login", "register"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === "login" ? "登录" : "注册"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="用户名" value={username} onChangeText={setUsername} placeholder="demo" autoCapitalize="none" />
        {mode === "register" ? (
          <Field label="邮箱" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        ) : null}
        <Field label="密码" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

        <TouchableOpacity style={styles.urlsToggle} onPress={() => setShowUrls((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.urlsToggleText}>{showUrls ? "收起服务地址" : "服务地址（可选）"}</Text>
        </TouchableOpacity>
        {showUrls ? (
          <View style={styles.urlsBox}>
            <Field label="User 服务" value={userUrl} onChangeText={setUserUrl} placeholder="http://localhost:8000" autoCapitalize="none" />
            <Field label="Meta 服务" value={metaUrl} onChangeText={setMetaUrl} placeholder="http://localhost:9093" autoCapitalize="none" />
            <Field label="Chat 服务" value={chatUrl} onChangeText={setChatUrl} placeholder="http://localhost:9095" autoCapitalize="none" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, (!canSubmit || busy) && styles.submitDisabled]}
          onPress={submit}
          disabled={!canSubmit || busy}
          activeOpacity={0.75}
        >
          <Text style={styles.submitText}>{busy ? "连接中…" : mode === "login" ? "登录" : "注册并登录"}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          登录后数据经由 caloplan-user / caloplan-core / caloplan-chat 模块读写；未登录时展示 Demo 数据。
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "email-address" | "default";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 3,
    gap: 3,
  },
  modeTab: {
    flex: 1,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActive: {
    backgroundColor: colors.surface,
  },
  modeText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modeTextActive: {
    color: colors.text,
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    height: 42,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  urlsToggle: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  urlsToggleText: {
    ...typography.caption,
    color: colors.accent,
  },
  urlsBox: { gap: spacing.md },
  error: {
    ...typography.bodySmall,
    color: colors.danger,
  },
  submit: {
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  submitText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },
});
